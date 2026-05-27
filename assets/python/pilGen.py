import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

def save_pill_to_desktop():
    # Setup the canvas
    fig, ax = plt.subplots(figsize=(6, 2))

    # Specified Color Palette
    bg_color = '#757575'     # Darker grey background
    fg_color = '#FFFFFF'     # White foreground
    border_color = '#616161'  # Slightly darker border for definition

    # Geometry Specs
    T_W, T_H = 0.8, 0.15      # Slim proportions
    T_X, T_Y = 0.1, 0.5 - (T_H/2)
    GAP = 0.008               # Ultra-tight gap

    # Knob Geometry (66.67% of proportional length)
    K_H = T_H - (2 * GAP)
    K_W = (K_H * 5.0) * 0.6667 
    K_X, K_Y = T_X + GAP, T_Y + GAP

    # Render Background Track (Pill shape)
    ax.add_patch(patches.FancyBboxPatch(
        (T_X, T_Y), T_W, T_H,
        boxstyle=f"round,pad=0,rounding_size={T_H/2}",
        facecolor=bg_color,
        edgecolor=border_color,
        linewidth=1
    ))

    # Render Foreground Knob (Pill shape)
    ax.add_patch(patches.FancyBboxPatch(
        (K_X, K_Y), K_W, K_H,
        boxstyle=f"round,pad=0,rounding_size={K_H/2}",
        facecolor=fg_color,
        edgecolor=border_color,
        linewidth=0.5,
        zorder=2
    ))

    # Formatting
    ax.set(xlim=(0, 1), ylim=(0, 1), aspect='equal')
    ax.axis('off')

    # Automatic path to your Desktop
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    file_path = os.path.join(desktop, "pil.png")
    
    # Save the file
    plt.savefig(file_path, format='png', bbox_inches='tight', transparent=True)
    plt.close()
    print(f"Image successfully saved to: {file_path}")

# Run the function
if __name__ == "__main__":
    save_pill_to_desktop()
