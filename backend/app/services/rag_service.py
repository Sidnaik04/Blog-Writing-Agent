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
    chunks = text_splitter.split_text(content)

    ids = [f"{blog_id}_{i}" for i in range(len(chunks))]

    collection.add(
        documents=chunks, ids=ids, metadatas=[{"blog_id": str(blog_id)} for _ in chunks]
    )


# ===============================
# RETRIEVE CONTEXT
# ===============================


def retrieve_context(query: str, blog_id: int):
    results = collection.query(query_texts=[query], n_results=4)

    docs = results["documents"][0]

    return "\n\n".join(docs)
