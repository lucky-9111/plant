from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session, joinedload

from app.auth import hash_password, verify_password
from app.database import get_db
from app.deps import get_current_customer
from app.models import (
    CANCELLABLE_STATUSES,
    CartItem,
    Customer,
    Order,
    OrderItem,
    OrderStatusHistory,
    Plant,
)
from app.notifications import notify_order_status
from app.schemas import (
    CartAddIn,
    CartItemOut,
    CartUpdateIn,
    CheckoutIn,
    CustomerLoginIn,
    CustomerOut,
    CustomerRegisterIn,
    OrderCancelIn,
    OrderOut,
    OrderSummaryOut,
)

router = APIRouter(prefix="/api/customer")


def get_or_404_order(db: Session, order_id: int, customer_id: int) -> Order:
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.history), joinedload(Order.customer))
        .filter(Order.id == order_id, Order.customer_id == customer_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


# ---------- Auth ----------


@router.post("/register", response_model=CustomerOut, status_code=201)
def register(payload: CustomerRegisterIn, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.query(Customer).filter(Customer.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    customer = Customer(
        name=payload.name.strip(),
        email=email,
        mobile=payload.mobile.strip(),
        hashed_password=hash_password(payload.password),
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    request.session["customer_id"] = customer.id
    return customer


@router.post("/login", response_model=CustomerOut)
def login(payload: CustomerLoginIn, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer or not verify_password(payload.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    request.session["customer_id"] = customer.id
    return customer


@router.post("/logout")
def logout(request: Request):
    request.session.pop("customer_id", None)
    return {"ok": True}


@router.get("/me", response_model=CustomerOut)
def me(customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return customer


# ---------- Cart ----------


@router.get("/cart", response_model=list[CartItemOut])
def get_cart(customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)):
    return (
        db.query(CartItem)
        .options(joinedload(CartItem.plant))
        .filter(CartItem.customer_id == customer_id)
        .order_by(CartItem.created_at)
        .all()
    )


@router.post("/cart", response_model=CartItemOut, status_code=201)
def add_to_cart(
    payload: CartAddIn,
    customer_id: int = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    plant = db.query(Plant).filter(Plant.id == payload.plant_id, Plant.is_active.is_(True)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    if payload.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    item = (
        db.query(CartItem)
        .filter(CartItem.customer_id == customer_id, CartItem.plant_id == payload.plant_id)
        .first()
    )
    if item:
        item.quantity += payload.quantity
    else:
        item = CartItem(customer_id=customer_id, plant_id=payload.plant_id, quantity=payload.quantity)
        db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/cart/{item_id}", response_model=CartItemOut)
def update_cart_item(
    item_id: int,
    payload: CartUpdateIn,
    customer_id: int = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.customer_id == customer_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if payload.quantity <= 0:
        db.delete(item)
        db.commit()
        raise HTTPException(status_code=204, detail="Removed")

    item.quantity = payload.quantity
    db.commit()
    db.refresh(item)
    return item


@router.delete("/cart/{item_id}", status_code=204)
def remove_cart_item(
    item_id: int, customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)
):
    item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.customer_id == customer_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()


@router.delete("/cart", status_code=204)
def clear_cart(customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)):
    db.query(CartItem).filter(CartItem.customer_id == customer_id).delete()
    db.commit()


# ---------- Checkout & Orders ----------


@router.post("/checkout", response_model=OrderOut, status_code=201)
def checkout(
    payload: CheckoutIn,
    customer_id: int = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    cart_items = (
        db.query(CartItem)
        .options(joinedload(CartItem.plant))
        .filter(CartItem.customer_id == customer_id)
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=400, detail="Your cart is empty")

    for cart_item in cart_items:
        plant = cart_item.plant
        if not plant or not plant.is_active:
            raise HTTPException(status_code=400, detail=f"{plant.name if plant else 'A plant'} is no longer available")
        if plant.stock_quantity < cart_item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {plant.name}")

    subtotal = sum(item.plant.effective_price * item.quantity for item in cart_items)

    order = Order(
        customer_id=customer_id,
        status="Pending",
        payment_status="Pending",
        payment_method=payload.payment_method,
        subtotal=subtotal,
        shipping_fee=0,
        total_amount=subtotal,
        delivery_name=payload.delivery_name.strip(),
        delivery_mobile=payload.delivery_mobile.strip(),
        delivery_line1=payload.delivery_line1.strip(),
        delivery_line2=payload.delivery_line2.strip(),
        delivery_city=payload.delivery_city.strip(),
        delivery_state=payload.delivery_state.strip(),
        delivery_pincode=payload.delivery_pincode.strip(),
    )
    db.add(order)
    db.flush()

    for cart_item in cart_items:
        plant = cart_item.plant
        db.add(
            OrderItem(
                order_id=order.id,
                plant_id=plant.id,
                plant_name=plant.name,
                plant_image_url=plant.image_url,
                unit_price=plant.effective_price,
                quantity=cart_item.quantity,
                line_total=plant.effective_price * cart_item.quantity,
            )
        )
        plant.stock_quantity -= cart_item.quantity

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            old_status=None,
            new_status="Pending",
            updated_by="customer",
            remarks="Order placed",
        )
    )
    db.query(CartItem).filter(CartItem.customer_id == customer_id).delete()
    db.commit()

    order = get_or_404_order(db, order.id, customer_id)
    notify_order_status(order, None, "Pending")
    return order


@router.get("/orders", response_model=list[OrderSummaryOut])
def list_orders(customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .filter(Order.customer_id == customer_id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("/orders/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int, customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)
):
    return get_or_404_order(db, order_id, customer_id)


@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: int,
    payload: OrderCancelIn,
    customer_id: int = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    order = get_or_404_order(db, order_id, customer_id)
    if order.status not in CANCELLABLE_STATUSES:
        raise HTTPException(
            status_code=400, detail=f"Orders can no longer be cancelled once they are {order.status}"
        )

    for item in order.items:
        if item.plant_id:
            plant = db.query(Plant).filter(Plant.id == item.plant_id).first()
            if plant:
                plant.stock_quantity += item.quantity

    old_status = order.status
    order.status = "Cancelled"
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            old_status=old_status,
            new_status="Cancelled",
            updated_by="customer",
            remarks=payload.remarks or "Cancelled by customer",
        )
    )
    db.commit()

    order = get_or_404_order(db, order_id, customer_id)
    notify_order_status(order, old_status, "Cancelled")
    return order
