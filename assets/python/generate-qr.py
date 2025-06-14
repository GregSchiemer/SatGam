# qr_generator.py
import os
import qrcode
from modules.fonts import get_font_paths
from PIL import Image, ImageDraw, ImageFont, ImageColor
from config import CANVAS_WIDTH, CANVAS_HEIGHT, QR_IMAGE_DIR, OUTPUT_DIR

os.makedirs(QR_IMAGE_DIR, exist_ok=True)

def generate_qr_image(obj):
    from modules.fonts import get_font_paths
    try:
        # Extract parameters from the object
        qr_name = obj.kwargs.get("name", "Unnamed QR")
        qr_size = obj.kwargs.get("side", 130)  # Fallback for legacy support
        qr_url = obj.kwargs.get("url", "")
        qr_id = obj.kwargs.get("id", "")
        annotation = obj.kwargs.get("annotation", "")
        foreground = obj.kwargs.get("foreground", "black")
        background = obj.kwargs.get("background", "white")

        # Compute layout dimensions
        extra_padding = int(qr_size * 0.35)
        qr_width = qr_size + extra_padding
        qr_height = qr_size

        # Store dimensions explicitly for use downstream
        obj.kwargs["width"] = qr_width
        obj.kwargs["height"] = qr_height

        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=3,
        )
        qr.add_data(qr_url)
        qr.make(fit=True)
        qr_code_img = qr.make_image(fill_color=foreground, back_color=background).convert('RGB')
        qr_code_img = qr_code_img.resize((qr_size, qr_size), Image.LANCZOS)

        # Create a new image with space on the left for the ID
        qr_img = Image.new("RGBA", (qr_width, qr_height), (0, 0, 0, 0))
        qr_img.paste(qr_code_img, (extra_padding, 0))

        # Draw ID label if present
        if qr_id:
            draw_qr = ImageDraw.Draw(qr_img)
            font_paths = get_font_paths()
            try:
                id_font = ImageFont.truetype(font_paths.get("bold", ""), 24)
            except IOError:
                id_font = ImageFont.load_default()

            text_width = draw_qr.textlength(qr_id, font=id_font)
            id_x = extra_padding - text_width
            id_y = (qr_height - id_font.size) * 0.05
            draw_qr.text((id_x, id_y), qr_id, fill="white", font=id_font)

        # Save the image
        image_filename = obj.kwargs.get("image_path", f"qr_{qr_name}.png")
        image_path = os.path.join(QR_IMAGE_DIR, image_filename)
        qr_img.save(image_path, "PNG")
        print(f"📌 Saved QR image: {image_path}")

    except Exception as e:
        print(f"⚠️ Error generating QR image: {e}")
        return None

