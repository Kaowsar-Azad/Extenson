# Shutterstock / Stock Vector Generation Rules

When writing scripts or extensions for Adobe Illustrator to generate vector artwork for Shutterstock and other stock sites, ALWAYS adhere to the following rules:

1. **Resolution / Artboard Size:**
   - The artwork size MUST be greater than 4 megapixels.
   - Use `3000 x 3000` pixels (9 Megapixels) or `4000 x 3000` pixels (12 Megapixels) as the standard default size.

2. **No Objects Outside the Artboard:**
   - **Crucial:** No anchor point, path, or stroke can extend beyond the edges of the artboard.
   - Limit the generation of elements mathematically so they stay well within the boundaries (e.g., using a 30px to 50px safe padding).
   - Additionally, wrap the entire generated artwork in a **Clipping Mask** that exactly matches the artboard dimensions to guarantee no stray pixels extend outside. Ensure the mask path is the top item in the group before enabling `.clipped = true`.

3. **Text and Typography:**
   - All text must be **outlined** (converted to paths). Stock sites reject files containing live, editable text.

4. **EPS 10 Compatibility:**
   - Files are usually saved as EPS 10.
   - EPS 10 does not support modern transparency, blending modes, or live effects easily. 
   - DO NOT use Illustrator transparency or opacity settings, as they can cause "PARM errors" when saving as EPS 10. Use solid colors and standard gradients (like CMYK GradientColor with 100% opacity stops) to simulate transparency.
   - Ensure `embedAllFonts = false` is passed to `EPSSaveOptions`.

5. **CMYK Color Space:**
   - Always work in `DocumentColorSpace.CMYK` for print-ready stock vectors. Parse hex colors into `CMYKColor` objects.

By following these rules, all scripts generated will automatically produce files that pass automated pre-flight checks on Shutterstock, Adobe Stock, and Freepik.
