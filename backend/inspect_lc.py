
import langchain
print(f"LangChain version: {langchain.__version__}")
try:
    import langchain.chains
    print("langchain.chains exists")
    from langchain.chains import RetrievalQA
    print("RetrievalQA imported")
except ImportError as e:
    print(f"ImportError: {e}")
    print("Contents of langchain:")
    print(dir(langchain))
