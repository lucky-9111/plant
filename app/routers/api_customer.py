import secrets
from datetime import datetime, timedelta

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
    WishlistItem,
)
from app.notifications import notify_order_status, send_email
from app.schemas import (
    CartAddIn,
    CartItemOut,
    CartUpdateIn,
    CheckoutIn,
    CustomerLoginIn,
    CustomerOut,
    CustomerRegisterIn,
    ForgotPasswordIn,
    OrderCancelIn,
    OrderOut,
    OrderSummaryOut,
    ResetPasswordIn,
    WishlistAddIn,
    WishlistItemOut,
    WishlistStatusOut,
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
    request.session.pop("admin_username", None)
    request.session["customer_id"] = customer.id
    return customer


@router.post("/login", response_model=CustomerOut)
def login(payload: CustomerLoginIn, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    customer = db.query(Customer).filter(Customer.email == email).first()
    if not customer or not verify_password(payload.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    request.session.pop("admin_username", None)
    request.session["customer_id"] = customer.id
    return customer


@router.post("/logout")
def logout(request: Request):
    request.session.pop("customer_id", None)
    return {"ok": True}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, request: Request, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    customer = db.query(Customer).filter(Customer.email == email).first()
    if customer:
        token = secrets.token_urlsafe(32)
        customer.reset_token = token
        customer.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        link = f"{request.base_url}reset-password?token={token}"
        print(f"[password-reset] {customer.email}: {link}")
        send_email(customer.email, "Reset your password", f"Click to reset your password: {link}")

    return {"ok": True}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.reset_token == payload.token).first()
    if not customer or not customer.reset_token_expires or customer.reset_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    customer.hashed_password = hash_password(payload.password)
    customer.reset_token = None
    customer.reset_token_expires = None
    db.commit()
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


# ---------- Wishlist ----------


@router.get("/wishlist", response_model=list[WishlistItemOut])
def get_wishlist(customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)):
    return (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.plant))
        .filter(WishlistItem.customer_id == customer_id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )


@router.get("/wishlist/status/{plant_id}", response_model=WishlistStatusOut)
def get_wishlist_status(
    plant_id: int, customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)
):
    exists = (
        db.query(WishlistItem)
        .filter(WishlistItem.customer_id == customer_id, WishlistItem.plant_id == plant_id)
        .first()
        is not None
    )
    return WishlistStatusOut(in_wishlist=exists)


@router.post("/wishlist", response_model=WishlistItemOut, status_code=201)
def add_to_wishlist(
    payload: WishlistAddIn,
    customer_id: int = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    plant = db.query(Plant).filter(Plant.id == payload.plant_id, Plant.is_active.is_(True)).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")

    item = (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.plant))
        .filter(WishlistItem.customer_id == customer_id, WishlistItem.plant_id == payload.plant_id)
        .first()
    )
    if item:
        return item

    item = WishlistItem(customer_id=customer_id, plant_id=payload.plant_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/wishlist/{plant_id}", status_code=204)
def remove_from_wishlist(
    plant_id: int, customer_id: int = Depends(get_current_customer), db: Session = Depends(get_db)
):
    item = (
        db.query(WishlistItem)
        .filter(WishlistItem.customer_id == customer_id, WishlistItem.plant_id == plant_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    db.delete(item)
    db.commit()


# ---------- Checkout & Orders ----------


@router.post("/checkout", response_model=OrderOut, status_code=201)
def checkout(
    payload: CheckoutIn,
    customer_id: int = Depends(get_current_customer),
    db: Session = Depends(get_db),
):
    buy_now = payload.buy_now_plant_id is not None
    clear_cart = not buy_now

    if buy_now:
        if payload.buy_now_quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1")
        plant = (
            db.query(Plant)
            .filter(Plant.id == payload.buy_now_plant_id, Plant.is_active.is_(True))
            .first()
        )
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found")
        if plant.stock_quantity < payload.buy_now_quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {plant.name}")
        order_lines = [(plant, payload.buy_now_quantity)]
    else:
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

        order_lines = [(cart_item.plant, cart_item.quantity) for cart_item in cart_items]

    subtotal = sum(plant.effective_price * quantity for plant, quantity in order_lines)

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

    for plant, quantity in order_lines:
        db.add(
            OrderItem(
                order_id=order.id,
                plant_id=plant.id,
                plant_name=plant.name,
                plant_image_url=plant.image_url,
                unit_price=plant.effective_price,
                quantity=quantity,
                line_total=plant.effective_price * quantity,
            )
        )
        plant.stock_quantity -= quantity

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            old_status=None,
            new_status="Pending",
            updated_by="customer",
            remarks="Order placed",
        )
    )
    if clear_cart:
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
