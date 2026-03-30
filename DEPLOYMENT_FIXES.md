# Deployment Fixes - Blog Generation Issues

## Issues Fixed

### 1. ✅ Image Generation Error: "name 'os' is not defined"

**Problem:** The `langgraph_service.py` was missing `import os`, causing image generation to fail with "name 'os' is not defined".

**Fix Applied:** Added `import os` to the imports in `backend/app/services/langgraph_service.py`.

### 2. ✅ ChromaDB Data Loss on Server Restart

**Problem:** ChromaDB was using in-memory storage that got wiped when Render servers restarted, causing RAG to fail with "blog content was not provided".

**Fix Applied:**

- Changed `chromadb.Client()` to `chromadb.PersistentClient(path=chroma_dir)` in `rag_service.py`
- Data now persists to `/tmp/chroma_db` (which is retained during server restarts on Render)
- Alternative: Can use `$CHROMA_DB_DIR` environment variable to customize storage location

### 3. ✅ Improved API Key Handling

**Problem:** Image generation was only checking `os.environ.get()`, ignoring the API key passed through the graph context.

**Fix Applied:**

- Updated `_gemini_generate_image_bytes()` to check context API key first
- Falls back to environment variable, then settings
- Ensures user's provided API key is used for image generation

## Required Environment Variables on Render

Ensure these are set in your Render dashboard:

```
GOOGLE_API_KEY        - Your Google Gemini API key
CLOUDINARY_CLOUD_NAME - Your Cloudinary cloud name
CLOUDINARY_API_KEY    - Your Cloudinary API key
CLOUDINARY_API_SECRET - Your Cloudinary API secret
TAVILY_API_KEY        - Your Tavily search API key (optional)
DATABASE_URL          - Your PostgreSQL database URL
CHROMA_DB_DIR         - (Optional) ChromaDB storage path, defaults to /tmp/chroma_db
```

Note: `/tmp` on Render persists across container restarts (as of 2024), making it suitable for ChromaDB storage.

## Testing After Deployment

1. **Test Blog Generation:**
   - Generate a blog with images
   - Verify images are generated and uploaded to Cloudinary
   - Verify blog appears in "My Blogs" list

2. **Test RAG/Chat:**
   - Generate a blog
   - Ask chat questions about the blog content
   - Verify chat returns accurate answers from blog content

3. **Test Data Persistence:**
   - Generate blogs
   - Restart the Render service
   - Verify blogs and RAG data are still available

## Troubleshooting

### Image Generation Still Fails

- Check Render logs: Look for "name 'os' is not defined" or other image generation errors
- Verify `GOOGLE_API_KEY` is set in Render environment
- Check Google Gemini quota limits

### Chat Says "Blog Content Was Not Provided"

- The blog was likely generated before the ChromaDB fix
- Generate a new blog after deployment
- Or restart the Render service to reinitialize ChromaDB

### "Failed to fetch Retry" on Frontend

- This typically means the blog creation API is failing
- Check Render logs for detailed error messages
- Verify database connection (`DATABASE_URL`)
- Check that the generated markdown is valid

## Files Modified

1. `backend/app/services/langgraph_service.py` - Added `import os`, fixed API key handling
2. `backend/app/services/rag_service.py` - Changed to persistent ChromaDB storage
