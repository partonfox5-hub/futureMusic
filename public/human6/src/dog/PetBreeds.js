// Game-tuned characteristics, not predictions about individual animals.
export const PET_BREEDS={
  "labrador": {
    "name": "Labrador Retriever",
    "species": "dog",
    "scale": 1.0,
    "bulk": 1.0,
    "head": [
      0.102,
      0.097,
      0.112
    ],
    "headCenter": [
      0,
      0.746,
      0.398
    ],
    "muzzle": [
      0.066,
      0.04,
      0.106
    ],
    "muzzleCenter": [
      0,
      0.699,
      0.511
    ],
    "ear": "drop",
    "earLength": 0.15,
    "coat": "yellow",
    "eye": 7026968,
    "fur": 0.65,
    "speed": 1.0,
    "sociability": 0.9,
    "voice": 1.0,
    "carry": 9,
    "gait": 1.0,
    "note": "Broad chest, otter tail, soft drop ears; sociable fetch companion."
  },
  "beagle": {
    "name": "Beagle",
    "species": "dog",
    "scale": 0.72,
    "bulk": 0.88,
    "head": [
      0.098,
      0.092,
      0.109
    ],
    "headCenter": [
      0,
      0.752,
      0.4
    ],
    "muzzle": [
      0.057,
      0.038,
      0.1
    ],
    "muzzleCenter": [
      0,
      0.705,
      0.51
    ],
    "ear": "drop",
    "earLength": 0.215,
    "coat": "tricolor",
    "eye": 5321758,
    "fur": 0.6,
    "speed": 0.94,
    "sociability": 0.8,
    "voice": 1.14,
    "carry": 4,
    "gait": 1.16,
    "note": "Compact hound, long rounded ears, tricolor saddle; curious scent explorer."
  },
  "shepherd": {
    "name": "German Shepherd",
    "species": "dog",
    "scale": 1.08,
    "bulk": 0.9,
    "head": [
      0.084,
      0.096,
      0.112
    ],
    "headCenter": [
      0,
      0.757,
      0.408
    ],
    "muzzle": [
      0.048,
      0.036,
      0.113
    ],
    "muzzleCenter": [
      0,
      0.71,
      0.524
    ],
    "ear": "upright",
    "earLength": 0.105,
    "coat": "saddle",
    "eye": 5649179,
    "fur": 1.15,
    "speed": 1.12,
    "sociability": 0.65,
    "voice": 0.88,
    "carry": 11,
    "gait": 0.95,
    "note": "Longer wedge muzzle, erect ears, sable saddle; alert and athletic."
  },
  "british": {
    "name": "British Shorthair",
    "species": "cat",
    "scale": 0.5,
    "bulk": 0.87,
    "head": [
      0.121,
      0.107,
      0.087
    ],
    "headCenter": [
      0,
      0.663,
      0.371
    ],
    "muzzle": [
      0.038,
      0.024,
      0.039
    ],
    "muzzleCenter": [
      0,
      0.629,
      0.44
    ],
    "ear": "upright",
    "earLength": 0.095,
    "coat": "blue",
    "eye": 13403697,
    "fur": 0.9,
    "speed": 0.82,
    "sociability": 0.45,
    "voice": 0.9,
    "carry": 2,
    "gait": 0.9,
    "note": "Round cheeks, stocky body, dense blue coat; calm and unhurried."
  },
  "siamese": {
    "name": "Siamese",
    "species": "cat",
    "scale": 0.47,
    "bulk": 0.65,
    "head": [
      0.083,
      0.09,
      0.095
    ],
    "headCenter": [
      0,
      0.671,
      0.375
    ],
    "muzzle": [
      0.032,
      0.022,
      0.047
    ],
    "muzzleCenter": [
      0,
      0.637,
      0.446
    ],
    "ear": "upright",
    "earLength": 0.115,
    "coat": "points",
    "eye": 6527948,
    "fur": 0.4,
    "speed": 1.15,
    "sociability": 0.98,
    "voice": 1.12,
    "carry": 1.6,
    "gait": 1.1,
    "note": "Lean body, wedge head, large ears, blue eyes and seal points; social and vocal."
  },
  "maine": {
    "name": "Maine Coon",
    "species": "cat",
    "scale": 0.61,
    "bulk": 0.92,
    "head": [
      0.105,
      0.103,
      0.1
    ],
    "headCenter": [
      0,
      0.677,
      0.382
    ],
    "muzzle": [
      0.044,
      0.028,
      0.044
    ],
    "muzzleCenter": [
      0,
      0.636,
      0.453
    ],
    "ear": "upright",
    "earLength": 0.12,
    "coat": "tabby",
    "eye": 9939030,
    "fur": 1.8,
    "speed": 0.96,
    "sociability": 0.8,
    "voice": 1.04,
    "carry": 3,
    "gait": 0.93,
    "note": "Large frame, square muzzle, neck ruff, ear tufts and full tail; gentle and inquisitive."
  }
};
export const breedFor=(species,id)=>PET_BREEDS[id]?.species===species?PET_BREEDS[id]:PET_BREEDS[species==='cat'?'british':'labrador'];
export const breedIdFor=(species,id)=>PET_BREEDS[id]?.species===species?id:species==='cat'?'british':'labrador';
