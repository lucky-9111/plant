import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { Loading, Empty } from "../components/Loading";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPost(null);
    setNotFound(false);
    api
      .get(`/blog/${slug}`)
      .then(setPost)
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="section container">
        <Empty>Post not found.</Empty>
        <div style={{ textAlign: "center" }}>
          <Link to="/blog" className="btn btn-primary">
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  if (!post) return <Loading />;

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
          {new Date(post.published_at).toLocaleDateString()}
        </span>
        <h1>{post.title}</h1>
        {post.image_url && (
          <img
            className="card"
            style={{ aspectRatio: "16/9", objectFit: "cover", marginBottom: 24 }}
            src={post.image_url}
            alt={post.title}
          />
        )}
        <p style={{ fontSize: "1.05rem", whiteSpace: "pre-wrap" }}>{post.content}</p>
        <Link to="/blog" className="btn btn-outline dark">
          Back to Blog
        </Link>
      </div>
    </section>
  );
}
