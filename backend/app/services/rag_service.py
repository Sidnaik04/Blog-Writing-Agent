import os
import chromadb
from chromadb.utils import embedding_functions

from langchain_text_splitters import RecursiveCharacterTextSplitter

# ===============================
# CHROMA CLIENT
# ===============================

# Use persistent ChromaDB for production deployments (e.g., Render)
# This ensures RAG data persists across server restarts
chroma_dir = os.getenv("CHROMA_DB_DIR", "/tmp/chroma_db")
os.makedirs(chroma_dir, exist_ok=True)

chroma_client = chromadb.PersistentClient(path=chroma_dir)

collection = chroma_client.get_or_create_collection(name="blogs")

# ===============================
# TEXT SPLITTER
# ===============================

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)


# ===============================
# STORE BLOG
# ===============================


def store_blog(blog_id: int, content: str):
    """Store blog content in ChromaDB for RAG retrieval."""
    try:
        chunks = text_splitter.split_text(content)
        ids = [f"{blog_id}_{i}" for i in range(len(chunks))]

        print(f"Storing blog {blog_id} with {len(chunks)} chunks")

        collection.add(
            documents=chunks,
            ids=ids,
            metadatas=[{"blog_id": str(blog_id)} for _ in chunks],
        )
        print(f"Blog {blog_id} stored in RAG system")
    except Exception as e:
        print(f"Error storing blog in RAG: {e}")
        raise


# ===============================
# RETRIEVE CONTEXT
# ===============================


def retrieve_context(query: str, blog_id: int):
    """Retrieve relevant context from blog using semantic search."""
    try:
        print(f"Retrieving context for blog {blog_id}, query: '{query}'")

        # Query with metadata filter to only get this blog's documents
        try:
            results = collection.query(
                query_texts=[query], where={"blog_id": str(blog_id)}, n_results=4
            )
        except Exception as filter_error:
            # If where clause fails, try without filter and manually filter results
            print(
                f"Where clause query failed: {filter_error}, trying without filter..."
            )
            results = collection.query(query_texts=[query], n_results=10)

            # Manually filter by blog_id from metadata
            if (
                results
                and results.get("documents")
                and results.get("metadatas")
                and len(results["documents"]) > 0
            ):
                filtered_docs = []
                filtered_meta = []
                for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
                    if meta.get("blog_id") == str(blog_id):
                        filtered_docs.append(doc)
                        filtered_meta.append(meta)

                if filtered_docs:
                    results["documents"][0] = filtered_docs[:4]
                    results["metadatas"][0] = filtered_meta[:4]
                    print(f"Manual filter found {len(filtered_docs)} documents")
                else:
                    print(f"No documents for blog {blog_id} in full collection")

        # Check if results exist
        if (
            not results
            or not results.get("documents")
            or len(results["documents"]) == 0
        ):
            print(f"No documents found for blog {blog_id}")
            return ""

        docs = results["documents"][0]
        if not docs:
            print(f"Empty document list for blog {blog_id}")
            return ""

        context = "\n\n".join(docs)
        print(
            f"Retrieved {len(docs)} document chunks for blog {blog_id} ({len(context)} chars)"
        )
        return context

    except Exception as e:
        print(f"Error retrieving context: {e}")
        import traceback

        traceback.print_exc()
        return ""


# ===============================
# DIAGNOSTICS
# ===============================


def get_collection_stats():
    """Get statistics about the RAG collection for debugging."""
    try:
        count = collection.count()
        print(f"RAG Collection Stats: {count} documents")
        return {"total_documents": count, "status": "ok", "collection_name": "blogs"}
    except Exception as e:
        error_msg = f"Error getting stats: {str(e)}"
        print(f"{error_msg}")
        return {"error": error_msg, "status": "error"}
