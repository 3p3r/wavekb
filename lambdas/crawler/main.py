import os
import tempfile

from fastapi import FastAPI, UploadFile, File

from markitdown import MarkItDown

from mangum import Mangum

app = FastAPI()

md = MarkItDown(enable_plugins=False)

@app.post("/convert")
async def convert(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name
    result = md.convert(tmp_path)
    markdown = result.text_content
    os.remove(tmp_path)
    return {"markdown": markdown}

@app.get("/health")
async def health():
    return {"status": "healthy"}

handler = Mangum(app=app)
