const { DIMENSIONS, defaultPrefs } = require("../../public/lattice/js/dimensions.js");

const ARCHETYPES = [
  { name: "explorer", bias: { openness: 82, stimulation: 80, travel: 85, routine: 25, extraversion: 68 } },
  { name: "builder", bias: { conscientiousness: 84, achievement: 78, careerFocus: 74, orderliness: 76, routine: 70 } },
  { name: "caretaker", bias: { benevolence: 88, warmth: 82, agreeableness: 80, familyOrientation: 78, affection: 76 } },
  { name: "scholar", bias: { intellect: 88, openness: 76, science: 82, extraversion: 38, urbanRural: 72 } },
  { name: "artist", bias: { arts: 90, openness: 84, hedonism: 64, nightOwl: 72, routine: 30 } },
  { name: "athlete", bias: { fitness: 88, outdoors: 78, extraversion: 70, hedonism: 55, alcohol: 35 } },
  { name: "diplomat", bias: { agreeableness: 78, communication: 80, universalism: 74, conflictDirect: 55, politics: 42 } },
  { name: "anchor", bias: { security: 80, tradition: 68, familyOrientation: 74, attachAvoidance: 30, relationshipPace: 35 } }
];

const PEOPLE = [
  { userId: "seed:mia-chen", displayName: "Mia Chen", age: 31, gender: "woman", seeking: ["man", "nonbinary"], city: "Singapore", country: "Singapore", lat: 1.35, lng: 103.82, bio: "Product designer who runs at dawn and cooks late. Looking for a calm mind with a sharp sense of humor.", education: "master", occupation: "Product designer", religion: "none", languages: ["English", "Mandarin"], intent: "long-term", arch: 1, seed: 11 },
  { userId: "seed:julian-okoro", displayName: "Julian Okoro", age: 34, gender: "man", seeking: ["woman"], city: "Lagos", country: "Nigeria", lat: 6.52, lng: 3.38, bio: "Architect restoring old courtyards. Weekends are for the water and long conversations that go nowhere on purpose.", education: "master", occupation: "Architect", religion: "Christian", languages: ["English", "Yoruba"], intent: "marriage", arch: 7, seed: 21 },
  { userId: "seed:sofia-alvarez", displayName: "Sofia Alvarez", age: 28, gender: "woman", seeking: ["man", "woman"], city: "Mexico City", country: "Mexico", lat: 19.43, lng: -99.13, bio: "Documentary editor. I notice small things. I want someone who can sit in silence without making it a problem.", education: "bachelor", occupation: "Film editor", religion: "none", languages: ["Spanish", "English"], intent: "dating", arch: 4, seed: 31 },
  { userId: "seed:erik-nilsen", displayName: "Erik Nilsen", age: 36, gender: "man", seeking: ["woman"], city: "Oslo", country: "Norway", lat: 59.91, lng: 10.75, bio: "Climate researcher, amateur baker. I like plans, but I like changing them together more.", education: "doctorate", occupation: "Researcher", religion: "none", languages: ["Norwegian", "English"], intent: "long-term", arch: 3, seed: 41 },
  { userId: "seed:amira-hassan", displayName: "Amira Hassan", age: 29, gender: "woman", seeking: ["man"], city: "Dubai", country: "UAE", lat: 25.2, lng: 55.27, bio: "Strategy consultant who still writes letters. Family matters. Ambition does too.", education: "master", occupation: "Consultant", religion: "Muslim", languages: ["Arabic", "English"], intent: "marriage", arch: 1, seed: 51 },
  { userId: "seed:noah-park", displayName: "Noah Park", age: 27, gender: "man", seeking: ["woman", "nonbinary"], city: "Seoul", country: "South Korea", lat: 37.57, lng: 126.98, bio: "Sound engineer. I collect field recordings and terrible coffee. Looking for someone curious, not loud.", education: "bachelor", occupation: "Sound engineer", religion: "none", languages: ["Korean", "English"], intent: "dating", arch: 4, seed: 61 },
  { userId: "seed:leila-benami", displayName: "Leila Benami", age: 33, gender: "woman", seeking: ["man"], city: "Paris", country: "France", lat: 48.86, lng: 2.35, bio: "Literary translator. I walk cities until my feet hurt. Want a partner who reads, not performs reading.", education: "master", occupation: "Translator", religion: "Jewish", languages: ["French", "Hebrew", "English"], intent: "long-term", arch: 3, seed: 71 },
  { userId: "seed:marcus-hale", displayName: "Marcus Hale", age: 38, gender: "man", seeking: ["woman"], city: "Austin", country: "United States", lat: 30.27, lng: -97.74, bio: "Robotics hardware. Trail running on weekends. Direct, loyal, slightly allergic to small talk.", education: "master", occupation: "Robotics engineer", religion: "none", languages: ["English"], intent: "long-term", arch: 5, seed: 81 },
  { userId: "seed:priya-raman", displayName: "Priya Raman", age: 30, gender: "woman", seeking: ["man"], city: "Bengaluru", country: "India", lat: 12.97, lng: 77.59, bio: "Founder of a small climate-data studio. I want someone kind under pressure, not just on a first walk.", education: "master", occupation: "Founder", religion: "Hindu", languages: ["English", "Kannada", "Hindi"], intent: "marriage", arch: 1, seed: 91 },
  { userId: "seed:theo-martins", displayName: "Theo Martins", age: 26, gender: "man", seeking: ["woman"], city: "Lisbon", country: "Portugal", lat: 38.72, lng: -9.14, bio: "Chef. I wake late and work later. Looking for a night person who still wants a garden someday.", education: "some college", occupation: "Chef", religion: "none", languages: ["Portuguese", "English"], intent: "dating", arch: 4, seed: 101 },
  { userId: "seed:hana-sato", displayName: "Hana Sato", age: 32, gender: "woman", seeking: ["man"], city: "Tokyo", country: "Japan", lat: 35.68, lng: 139.69, bio: "Ceramicist and part-time lecturer. Quiet home, serious craft. I like people who keep their word.", education: "master", occupation: "Artist", religion: "none", languages: ["Japanese", "English"], intent: "long-term", arch: 4, seed: 111 },
  { userId: "seed:daniel-rossi", displayName: "Daniel Rossi", age: 41, gender: "man", seeking: ["woman"], city: "Milan", country: "Italy", lat: 45.46, lng: 9.19, bio: "Gallery director. Two decades of looking at pictures. I want a partner who has her own work.", education: "master", occupation: "Gallery director", religion: "Catholic", languages: ["Italian", "English"], intent: "long-term", arch: 6, seed: 121 },
  { userId: "seed:aya-nkrumah", displayName: "Aya Nkrumah", age: 24, gender: "woman", seeking: ["man", "woman"], city: "Accra", country: "Ghana", lat: 5.6, lng: -0.19, bio: "Policy intern by day, radio DJ by night. High energy, high standards, low drama.", education: "bachelor", occupation: "Policy intern", religion: "Christian", languages: ["English", "Twi"], intent: "dating", arch: 0, seed: 131 },
  { userId: "seed:owen-blake", displayName: "Owen Blake", age: 29, gender: "man", seeking: ["woman"], city: "Toronto", country: "Canada", lat: 43.65, lng: -79.38, bio: "ER nurse. I have seen enough chaos to want a peaceful house. Humor is non-negotiable.", education: "bachelor", occupation: "Nurse", religion: "none", languages: ["English", "French"], intent: "long-term", arch: 2, seed: 141 },
  { userId: "seed:ines-volkov", displayName: "Ines Volkov", age: 35, gender: "nonbinary", seeking: ["man", "woman", "nonbinary"], city: "Berlin", country: "Germany", lat: 52.52, lng: 13.4, bio: "Urbanist working on housing. I bike everywhere. Looking for intellectual heat without cruelty.", education: "doctorate", occupation: "Urbanist", religion: "none", languages: ["German", "English", "Russian"], intent: "dating", arch: 3, seed: 151 },
  { userId: "seed:camila-torres", displayName: "Camila Torres", age: 27, gender: "woman", seeking: ["man"], city: "Buenos Aires", country: "Argentina", lat: -34.6, lng: -58.38, bio: "Violinist. I practice in the mornings and disappear into books at night. Want someone steady.", education: "bachelor", occupation: "Musician", religion: "none", languages: ["Spanish", "English"], intent: "long-term", arch: 4, seed: 161 },
  { userId: "seed:james-whitaker", displayName: "James Whitaker", age: 44, gender: "man", seeking: ["woman"], city: "Edinburgh", country: "United Kingdom", lat: 55.95, lng: -3.19, bio: "Historian. Walks, whisky in moderation, strong opinions held lightly. Ready for a real household.", education: "doctorate", occupation: "Historian", religion: "none", languages: ["English"], intent: "marriage", arch: 7, seed: 171 },
  { userId: "seed:yara-mansour", displayName: "Yara Mansour", age: 31, gender: "woman", seeking: ["man"], city: "Beirut", country: "Lebanon", lat: 33.89, lng: 35.5, bio: "Journalist. I am loyal and impatient. Looking for someone who can match both.", education: "master", occupation: "Journalist", religion: "none", languages: ["Arabic", "French", "English"], intent: "long-term", arch: 6, seed: 181 },
  { userId: "seed:kenji-morales", displayName: "Kenji Morales", age: 28, gender: "man", seeking: ["woman", "nonbinary"], city: "Los Angeles", country: "United States", lat: 34.05, lng: -118.24, bio: "Game designer. I care about systems and people in equal measure. Want a co-conspirator, not an audience.", education: "bachelor", occupation: "Game designer", religion: "none", languages: ["English", "Spanish"], intent: "dating", arch: 0, seed: 191 },
  { userId: "seed:freya-lind", displayName: "Freya Lind", age: 37, gender: "woman", seeking: ["man"], city: "Stockholm", country: "Sweden", lat: 59.33, lng: 18.07, bio: "Pediatrician. I want children and a garden. I do not want to perform a personality.", education: "doctorate", occupation: "Pediatrician", religion: "none", languages: ["Swedish", "English"], intent: "marriage", arch: 2, seed: 201 },
  { userId: "seed:rafael-costa", displayName: "Rafael Costa", age: 33, gender: "man", seeking: ["woman"], city: "São Paulo", country: "Brazil", lat: -23.55, lng: -46.63, bio: "Civil engineer who dances. Serious about work, unserious about almost everything else.", education: "bachelor", occupation: "Engineer", religion: "Catholic", languages: ["Portuguese", "English"], intent: "long-term", arch: 5, seed: 211 },
  { userId: "seed:nina-kowal", displayName: "Nina Kowal", age: 26, gender: "woman", seeking: ["man"], city: "Warsaw", country: "Poland", lat: 52.23, lng: 21.01, bio: "Backend engineer. Climbing gym, analog cameras, very little patience for games in dating.", education: "bachelor", occupation: "Software engineer", religion: "none", languages: ["Polish", "English"], intent: "dating", arch: 1, seed: 221 },
  { userId: "seed:samuel-adebayo", displayName: "Samuel Adebayo", age: 39, gender: "man", seeking: ["woman"], city: "London", country: "United Kingdom", lat: 51.51, lng: -0.13, bio: "Finance, formerly military. Direct, protective, trying to be softer than my training. Want a partner, not a project.", education: "master", occupation: "Analyst", religion: "Christian", languages: ["English"], intent: "marriage", arch: 7, seed: 231 },
  { userId: "seed:lina-berg", displayName: "Lina Berg", age: 30, gender: "woman", seeking: ["woman", "nonbinary"], city: "Amsterdam", country: "Netherlands", lat: 52.37, lng: 4.9, bio: "Museum educator. Bikes, bread, and long talks on canals. Looking for intellectual intimacy first.", education: "master", occupation: "Educator", religion: "none", languages: ["Dutch", "English"], intent: "long-term", arch: 6, seed: 241 },
  { userId: "seed:hassan-elamin", displayName: "Hassan Elamin", age: 32, gender: "man", seeking: ["woman"], city: "Cairo", country: "Egypt", lat: 30.04, lng: 31.24, bio: "Novelist and teacher. I believe in ritual and in leaving the city sometimes. Looking for warmth with a spine.", education: "master", occupation: "Writer", religion: "Muslim", languages: ["Arabic", "English"], intent: "marriage", arch: 2, seed: 251 },
  { userId: "seed:claire-dupont", displayName: "Claire Dupont", age: 42, gender: "woman", seeking: ["man"], city: "Montreal", country: "Canada", lat: 45.5, lng: -73.57, bio: "University administrator. Two cats, one canoe. I know what I want and I am not in a hurry.", education: "master", occupation: "Administrator", religion: "none", languages: ["French", "English"], intent: "long-term", arch: 7, seed: 261 },
  { userId: "seed:mateo-silva", displayName: "Mateo Silva", age: 25, gender: "man", seeking: ["woman"], city: "Santiago", country: "Chile", lat: -33.45, lng: -70.67, bio: "Geologist. Mountains over clubs. I text slowly and show up fully.", education: "bachelor", occupation: "Geologist", religion: "none", languages: ["Spanish", "English"], intent: "dating", arch: 5, seed: 271 },
  { userId: "seed:anika-sharma", displayName: "Anika Sharma", age: 29, gender: "woman", seeking: ["man"], city: "New York", country: "United States", lat: 40.71, lng: -74.01, bio: "Public defender. Intense job, gentle off-hours. Want someone who understands both.", education: "doctorate", occupation: "Attorney", religion: "none", languages: ["English", "Hindi"], intent: "long-term", arch: 6, seed: 281 },
  { userId: "seed:jonas-meyer", displayName: "Jonas Meyer", age: 31, gender: "man", seeking: ["woman"], city: "Zurich", country: "Switzerland", lat: 47.38, lng: 8.54, bio: "Watchmaker. Precision is a personality. I still want surprise. Looking for someone who notices craft.", education: "some college", occupation: "Watchmaker", religion: "none", languages: ["German", "French", "English"], intent: "long-term", arch: 1, seed: 291 },
  { userId: "seed:mei-lin", displayName: "Mei Lin", age: 27, gender: "woman", seeking: ["man"], city: "Taipei", country: "Taiwan", lat: 25.03, lng: 121.57, bio: "Data scientist who paints on Sundays. I want a curious partner who can be boring with me on purpose.", education: "master", occupation: "Data scientist", religion: "none", languages: ["Mandarin", "English"], intent: "dating", arch: 3, seed: 301 },
  { userId: "seed:omar-farouk", displayName: "Omar Farouk", age: 36, gender: "man", seeking: ["woman"], city: "Amman", country: "Jordan", lat: 31.95, lng: 35.93, bio: "Hospitality founder. Hosts well, listens better. Family is close; I still have my own life.", education: "bachelor", occupation: "Founder", religion: "Muslim", languages: ["Arabic", "English"], intent: "marriage", arch: 2, seed: 311 },
  { userId: "seed:elena-popov", displayName: "Elena Popov", age: 34, gender: "woman", seeking: ["man"], city: "Prague", country: "Czechia", lat: 50.08, lng: 14.44, bio: "Violin restorer. I like old things done well. Looking for a man who is not performing youth.", education: "bachelor", occupation: "Luthier", religion: "none", languages: ["Czech", "English"], intent: "long-term", arch: 4, seed: 321 },
  { userId: "seed:ben-okafor", displayName: "Ben Okafor", age: 28, gender: "man", seeking: ["woman"], city: "Chicago", country: "United States", lat: 41.88, lng: -87.63, bio: "High school physics teacher. Coaching track. I want a partner who likes people, not just ideas.", education: "bachelor", occupation: "Teacher", religion: "Christian", languages: ["English"], intent: "marriage", arch: 5, seed: 331 },
  { userId: "seed:sara-nielsen", displayName: "Sara Nielsen", age: 23, gender: "woman", seeking: ["man", "nonbinary"], city: "Copenhagen", country: "Denmark", lat: 55.68, lng: 12.57, bio: "Architecture student. Bikes, bakeries, and arguments about cities. Looking for someone curious.", education: "some college", occupation: "Student", religion: "none", languages: ["Danish", "English"], intent: "dating", arch: 0, seed: 341 },
  { userId: "seed:lucas-fernandez", displayName: "Lucas Fernandez", age: 40, gender: "man", seeking: ["woman"], city: "Barcelona", country: "Spain", lat: 41.39, lng: 2.17, bio: "Marine biologist. Divorced, clear, kind. I want a second chapter that is quieter and truer.", education: "doctorate", occupation: "Scientist", religion: "none", languages: ["Spanish", "Catalan", "English"], intent: "long-term", arch: 3, seed: 351 },
  { userId: "seed:zoe-nakamura", displayName: "Zoe Nakamura", age: 29, gender: "nonbinary", seeking: ["woman", "nonbinary"], city: "Melbourne", country: "Australia", lat: -37.81, lng: 144.96, bio: "UX researcher. I ask too many questions. Looking for someone who likes being asked.", education: "master", occupation: "Researcher", religion: "none", languages: ["English", "Japanese"], intent: "dating", arch: 6, seed: 361 },
  { userId: "seed:ivan-petrov", displayName: "Ivan Petrov", age: 35, gender: "man", seeking: ["woman"], city: "Helsinki", country: "Finland", lat: 60.17, lng: 24.94, bio: "Sculptor who used to code. I talk little and mean it. Sauna is a personality test.", education: "bachelor", occupation: "Sculptor", religion: "none", languages: ["Finnish", "Russian", "English"], intent: "long-term", arch: 4, seed: 371 },
  { userId: "seed:nadia-khatib", displayName: "Nadia Khatib", age: 31, gender: "woman", seeking: ["man"], city: "Casablanca", country: "Morocco", lat: 33.57, lng: -7.59, bio: "Supply-chain lead. I travel for work and want a home that stays put. Loyalty over sparkle.", education: "master", occupation: "Operations lead", religion: "Muslim", languages: ["Arabic", "French", "English"], intent: "marriage", arch: 1, seed: 381 },
  { userId: "seed:tom-reeves", displayName: "Tom Reeves", age: 47, gender: "man", seeking: ["woman"], city: "Portland", country: "United States", lat: 45.51, lng: -122.68, bio: "Cabinetmaker. Grown kids, open calendar. I want companionship with someone who has already become herself.", education: "some college", occupation: "Craftsman", religion: "none", languages: ["English"], intent: "long-term", arch: 7, seed: 391 },
  { userId: "seed:aisha-bello", displayName: "Aisha Bello", age: 26, gender: "woman", seeking: ["man"], city: "Nairobi", country: "Kenya", lat: -1.29, lng: 36.82, bio: "Conservation biologist. Field weeks and city months. Looking for someone who can handle both.", education: "master", occupation: "Biologist", religion: "Christian", languages: ["English", "Swahili"], intent: "dating", arch: 0, seed: 401 },
  { userId: "seed:hugo-bergmann", displayName: "Hugo Bergmann", age: 33, gender: "man", seeking: ["woman"], city: "Vienna", country: "Austria", lat: 48.21, lng: 16.37, bio: "Classical pianist who also codes audio tools. I want a partner who has her own practice.", education: "master", occupation: "Musician", religion: "none", languages: ["German", "English"], intent: "long-term", arch: 4, seed: 411 },
  { userId: "seed:grace-okonkwo", displayName: "Grace Okonkwo", age: 38, gender: "woman", seeking: ["man"], city: "Atlanta", country: "United States", lat: 33.75, lng: -84.39, bio: "Community clinic director. I am tired of almosts. Looking for a grown man with a gentle mouth.", education: "master", occupation: "Clinic director", religion: "Christian", languages: ["English"], intent: "marriage", arch: 2, seed: 421 }
];

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTraits(age, arch, seed) {
  const rnd = mulberry32(seed);
  const traits = {};
  for (const d of DIMENSIONS) {
    const base = d.id === "age" ? age : d.id === "height" ? 155 + rnd() * 40 : 35 + rnd() * 30;
    const bias = arch.bias[d.id];
    const mixed = bias == null ? base : bias * 0.72 + base * 0.28;
    traits[d.id] = Math.round(Math.min(d.max, Math.max(d.min, mixed)));
  }
  traits.age = age;
  return traits;
}

function buildPrefs(traits, seed) {
  const rnd = mulberry32(seed + 99);
  const prefs = defaultPrefs(traits);
  for (const d of DIMENSIONS) {
    const jitter = (rnd() - 0.5) * 18;
    prefs[d.id] = {
      ideal: Math.min(d.max, Math.max(d.min, (traits[d.id] ?? 50) + jitter)),
      weight: rnd() > 0.7 ? 2 : rnd() > 0.15 ? 1 : 0.4
    };
  }
  prefs.age.weight = 1.6;
  prefs.kidsDesire.weight = 2.2;
  prefs.politics.weight = 1.4;
  return prefs;
}

const SEED_PEOPLE = PEOPLE.map((p) => {
  const arch = ARCHETYPES[p.arch] || ARCHETYPES[0];
  const traits = buildTraits(p.age, arch, p.seed);
  return {
    userId: p.userId,
    displayName: p.displayName,
    age: p.age,
    gender: p.gender,
    seeking: p.seeking,
    city: p.city,
    country: p.country,
    lat: p.lat,
    lng: p.lng,
    bio: p.bio,
    education: p.education,
    occupation: p.occupation,
    religion: p.religion,
    languages: p.languages,
    intent: p.intent,
    traits,
    prefs: buildPrefs(traits, p.seed),
    photoSeed: p.seed
  };
});

module.exports = { SEED_PEOPLE };
