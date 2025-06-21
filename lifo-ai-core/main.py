from PIL import Image
import pytesseract

# Set this if you're on Windows and tesseract is not in your PATH
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract'

img = Image.open('/home/slim/lifo-app/carte vitale.jpg')
text = pytesseract.image_to_string(img)
print(text)
