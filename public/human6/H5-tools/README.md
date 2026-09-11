# Offline pet surface generation

The game loads prebuilt `src/dog/PetSurfaces.js`; Python is not required at runtime. To regenerate the original procedural breed surfaces, install NumPy, SciPy and scikit-image in a Python environment, then run `python H5-tools/bake-pets.py`. The source includes breed proportions and the skin influence recipe. Keep the existing bone-name order and metre-based bind frame when altering it.

Audio edits are documented with original URLs and exact time ranges in `assets/pets/sources.json`. The shipped clips are mono 24 kHz MP3. Geometry and cash/leaf textures are original procedural work. Existing game assets and Three.js keep their existing licenses.
