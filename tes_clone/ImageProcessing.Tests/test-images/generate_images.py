import cv2
import numpy as np
import os

output_dir = r"C:\Users\netease\.openclaw\workspace\tes_clone\ImageProcessing.Tests\test-images"

# Create test images
os.makedirs(output_dir, exist_ok=True)

# 1. Red circles image
img1 = np.ones((200, 200, 3), dtype=np.uint8) * 255  # White background
for i in range(5):
    x, y = 50 + i * 30, 100
    cv2.circle(img1, (x, y), 15, (0, 0, 255), -1)  # Red
cv2.imwrite(os.path.join(output_dir, "blob_red_circles.png"), img1)
print("Created blob_red_circles.png")

# 2. Multi-color blobs
img2 = np.ones((300, 300, 3), dtype=np.uint8) * 255  # White background
# Circles
cv2.circle(img2, (75, 75), 25, (0, 0, 255), -1)   # Red
cv2.circle(img2, (150, 75), 25, (0, 255, 0), -1)  # Green
cv2.circle(img2, (225, 75), 25, (255, 0, 0), -1)  # Blue
# Rectangles
cv2.rectangle(img2, (50, 150), (100, 200), (0, 255, 255), -1)  # Yellow
cv2.rectangle(img2, (125, 150), (175, 200), (255, 0, 255), -1) # Purple
cv2.rectangle(img2, (200, 150), (250, 200), (255, 128, 0), -1)  # Orange
cv2.imwrite(os.path.join(output_dir, "blob_multi_color.png"), img2)
print("Created blob_multi_color.png")

# 3. Small blobs (noise-like)
img3 = np.ones((100, 100, 3), dtype=np.uint8) * 255
for _ in range(20):
    x, y = np.random.randint(10, 90, 2)
    cv2.circle(img3, (x, y), 3, (np.random.randint(0, 255), np.random.randint(0, 255), np.random.randint(0, 255)), -1)
cv2.imwrite(os.path.join(output_dir, "blob_small_noisy.png"), img3)
print("Created blob_small_noisy.png")

# 4. Large uniform blobs
img4 = np.ones((250, 250, 3), dtype=np.uint8) * 255
cv2.circle(img4, (125, 125), 50, (255, 0, 0), -1)  # Large blue
cv2.circle(img4, (60, 60), 30, (0, 255, 0), -1)    # Medium green
cv2.circle(img4, (190, 190), 25, (0, 0, 255), -1)  # Small red
cv2.imwrite(os.path.join(output_dir, "blob_large_uniform.png"), img4)
print("Created blob_large_uniform.png")

print(f"\nAll test images created in: {output_dir}")
