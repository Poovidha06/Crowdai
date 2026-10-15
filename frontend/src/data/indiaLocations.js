/**
 * Comprehensive Geographic Directory of India
 * Covering all 28 States, 8 Union Territories, major Districts,
 * renowned Colleges, Universities, Schools, and high-density Streets/Avenues.
 */

export const INDIA_STATES = [
  { id: 'tn', name: 'Tamil Nadu', lat: 11.1271, lng: 78.6569, zoom: 8, capital: 'Chennai' },
  { id: 'mh', name: 'Maharashtra', lat: 19.7515, lng: 75.7139, zoom: 7, capital: 'Mumbai' },
  { id: 'ka', name: 'Karnataka', lat: 15.3173, lng: 75.7139, zoom: 7, capital: 'Bengaluru' },
  { id: 'dl', name: 'Delhi (NCT)', lat: 28.6139, lng: 77.2090, zoom: 11, capital: 'New Delhi' },
  { id: 'up', name: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, zoom: 7, capital: 'Lucknow' },
  { id: 'kl', name: 'Kerala', lat: 10.8505, lng: 76.2711, zoom: 8, capital: 'Thiruvananthapuram' },
  { id: 'gj', name: 'Gujarat', lat: 22.2587, lng: 71.1924, zoom: 7, capital: 'Gandhinagar' },
  { id: 'wb', name: 'West Bengal', lat: 22.9868, lng: 87.8550, zoom: 7, capital: 'Kolkata' },
  { id: 'tg', name: 'Telangana', lat: 18.1124, lng: 79.0193, zoom: 7, capital: 'Hyderabad' },
  { id: 'ap', name: 'Andhra Pradesh', lat: 15.9129, lng: 79.7400, zoom: 7, capital: 'Amaravati' },
  { id: 'rj', name: 'Rajasthan', lat: 27.0238, lng: 74.2179, zoom: 7, capital: 'Jaipur' },
  { id: 'pb', name: 'Punjab', lat: 31.1471, lng: 75.3412, zoom: 8, capital: 'Chandigarh' },
  { id: 'hr', name: 'Haryana', lat: 29.0588, lng: 76.0856, zoom: 8, capital: 'Chandigarh' },
  { id: 'mp', name: 'Madhya Pradesh', lat: 22.9734, lng: 78.6569, zoom: 7, capital: 'Bhopal' },
  { id: 'br', name: 'Bihar', lat: 25.0961, lng: 85.3131, zoom: 7, capital: 'Patna' },
  { id: 'or', name: 'Odisha', lat: 20.9517, lng: 85.0985, zoom: 7, capital: 'Bhubaneswar' },
  { id: 'as', name: 'Assam', lat: 26.2006, lng: 92.9376, zoom: 7, capital: 'Dispur' },
  { id: 'jk', name: 'Jammu & Kashmir', lat: 33.7782, lng: 76.5762, zoom: 7, capital: 'Srinagar' },
  { id: 'ga', name: 'Goa', lat: 15.2993, lng: 74.1240, zoom: 10, capital: 'Panaji' },
  { id: 'uk', name: 'Uttarakhand', lat: 30.0668, lng: 79.0193, zoom: 8, capital: 'Dehradun' },
  { id: 'hp', name: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, zoom: 8, capital: 'Shimla' },
  { id: 'jh', name: 'Jharkhand', lat: 23.6102, lng: 85.2799, zoom: 7, capital: 'Ranchi' },
  { id: 'ct', name: 'Chhattisgarh', lat: 21.2787, lng: 81.8661, zoom: 7, capital: 'Raipur' },
  { id: 'ch', name: 'Chandigarh (UT)', lat: 30.7333, lng: 76.7794, zoom: 12, capital: 'Chandigarh' },
  { id: 'py', name: 'Puducherry (UT)', lat: 11.9416, lng: 79.8083, zoom: 13, capital: 'Puducherry' },
  { id: 'tr', name: 'Tripura', lat: 23.9408, lng: 91.9882, zoom: 8, capital: 'Agartala' },
  { id: 'mn', name: 'Manipur', lat: 24.6637, lng: 93.9063, zoom: 8, capital: 'Imphal' },
  { id: 'me', name: 'Meghalaya', lat: 25.4670, lng: 91.3662, zoom: 8, capital: 'Shillong' },
  { id: 'nl', name: 'Nagaland', lat: 26.1584, lng: 94.5624, zoom: 8, capital: 'Kohima' },
  { id: 'mz', name: 'Mizoram', lat: 23.1645, lng: 92.9376, zoom: 8, capital: 'Aizawl' },
  { id: 'sk', name: 'Sikkim', lat: 27.5330, lng: 88.5122, zoom: 9, capital: 'Gangtok' },
  { id: 'ar', name: 'Arunachal Pradesh', lat: 28.2180, lng: 94.7278, zoom: 7, capital: 'Itanagar' },
  { id: 'la', name: 'Ladakh (UT)', lat: 34.1526, lng: 77.5771, zoom: 7, capital: 'Leh' },
  { id: 'an', name: 'Andaman & Nicobar (UT)', lat: 11.7401, lng: 92.6586, zoom: 8, capital: 'Port Blair' },
  { id: 'dd', name: 'Dadra & Nagar Haveli & Daman & Diu', lat: 20.4283, lng: 72.8397, zoom: 11, capital: 'Daman' },
  { id: 'ld', name: 'Lakshadweep (UT)', lat: 10.5667, lng: 72.6417, zoom: 10, capital: 'Kavaratti' }
];

export const INDIA_DISTRICTS_AND_CITIES = [
  // Tamil Nadu
  { id: 'madurai', name: 'Madurai', state: 'Tamil Nadu', type: 'District & Cultural Hub', lat: 9.9252, lng: 78.1198, zoom: 14 },
  { id: 'chennai', name: 'Chennai', state: 'Tamil Nadu', type: 'Metropolitan City', lat: 13.0827, lng: 80.2707, zoom: 13 },
  { id: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu', type: 'Industrial Hub', lat: 11.0168, lng: 76.9558, zoom: 13 },
  { id: 'tiruchirappalli', name: 'Tiruchirappalli (Trichy)', state: 'Tamil Nadu', type: 'Central District', lat: 10.7905, lng: 78.7047, zoom: 14 },
  { id: 'salem', name: 'Salem', state: 'Tamil Nadu', type: 'Steel & Textile City', lat: 11.6643, lng: 78.1460, zoom: 14 },
  { id: 'tirunelveli', name: 'Tirunelveli', state: 'Tamil Nadu', type: 'Southern District', lat: 8.7139, lng: 77.7567, zoom: 14 },
  { id: 'thanjavur', name: 'Thanjavur', state: 'Tamil Nadu', type: 'Delta District', lat: 10.7870, lng: 79.1378, zoom: 14 },
  { id: 'vellore', name: 'Vellore', state: 'Tamil Nadu', type: 'Fort & Tech City', lat: 12.9165, lng: 79.1325, zoom: 14 },
  { id: 'erode', name: 'Erode', state: 'Tamil Nadu', type: 'Turmeric Hub', lat: 11.3410, lng: 77.7172, zoom: 14 },
  { id: 'tiruppur', name: 'Tiruppur', state: 'Tamil Nadu', type: 'Textile Hub', lat: 11.1085, lng: 77.3411, zoom: 14 },
  { id: 'dindigul', name: 'Dindigul', state: 'Tamil Nadu', type: 'Lock City', lat: 10.3673, lng: 77.9803, zoom: 14 },
  { id: 'tuticorin', name: 'Thoothukudi (Tuticorin)', state: 'Tamil Nadu', type: 'Port City', lat: 8.7642, lng: 78.1348, zoom: 14 },

  // Maharashtra
  { id: 'mumbai', name: 'Mumbai', state: 'Maharashtra', type: 'Financial Capital', lat: 19.0760, lng: 72.8777, zoom: 13 },
  { id: 'pune', name: 'Pune', state: 'Maharashtra', type: 'Education & IT Hub', lat: 18.5204, lng: 73.8567, zoom: 13 },
  { id: 'nagpur', name: 'Nagpur', state: 'Maharashtra', type: 'Winter Capital', lat: 21.1458, lng: 79.0882, zoom: 13 },
  { id: 'thane', name: 'Thane', state: 'Maharashtra', type: 'Lakes City', lat: 19.2183, lng: 72.9781, zoom: 14 },
  { id: 'nashik', name: 'Nashik', state: 'Maharashtra', type: 'Wine & Pilgrimage Hub', lat: 19.9975, lng: 73.7898, zoom: 14 },
  { id: 'aurangabad', name: 'Chhatrapati Sambhaji Nagar', state: 'Maharashtra', type: 'Heritage City', lat: 19.8762, lng: 75.3433, zoom: 14 },

  // Karnataka
  { id: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', type: 'Silicon Valley of India', lat: 12.9716, lng: 77.5946, zoom: 13 },
  { id: 'mysuru', name: 'Mysuru (Mysore)', state: 'Karnataka', type: 'Palace City', lat: 12.2958, lng: 76.6394, zoom: 14 },
  { id: 'mangaluru', name: 'Mangaluru', state: 'Karnataka', type: 'Coastal District', lat: 12.9141, lng: 74.8560, zoom: 14 },
  { id: 'hubballi', name: 'Hubballi-Dharwad', state: 'Karnataka', type: 'Commercial Hub', lat: 15.3647, lng: 75.1240, zoom: 14 },

  // Delhi NCR
  { id: 'new-delhi', name: 'New Delhi', state: 'Delhi (NCT)', type: 'National Capital', lat: 28.6139, lng: 77.2090, zoom: 13 },
  { id: 'noida', name: 'Noida / Greater Noida', state: 'Uttar Pradesh', type: 'Tech & Industrial City', lat: 28.5355, lng: 77.3910, zoom: 13 },
  { id: 'gurugram', name: 'Gurugram (Gurgaon)', state: 'Haryana', type: 'Corporate Millennium City', lat: 28.4595, lng: 77.0266, zoom: 13 },

  // Uttar Pradesh
  { id: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh', type: 'State Capital', lat: 26.8467, lng: 80.9462, zoom: 13 },
  { id: 'kanpur', name: 'Kanpur', state: 'Uttar Pradesh', type: 'Industrial City', lat: 26.4499, lng: 80.3319, zoom: 13 },
  { id: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', type: 'Holy Spiritual Capital', lat: 25.3176, lng: 82.9739, zoom: 14 },
  { id: 'agra', name: 'Agra', state: 'Uttar Pradesh', type: 'Taj Mahal Heritage City', lat: 27.1767, lng: 78.0081, zoom: 14 },

  // Telangana & Andhra Pradesh
  { id: 'hyderabad', name: 'Hyderabad', state: 'Telangana', type: 'Cyberabad Pearl City', lat: 17.3850, lng: 78.4867, zoom: 13 },
  { id: 'visakhapatnam', name: 'Visakhapatnam (Vizag)', state: 'Andhra Pradesh', type: 'Port & Steel City', lat: 17.6868, lng: 83.2185, zoom: 13 },
  { id: 'vijayawada', name: 'Vijayawada', state: 'Andhra Pradesh', type: 'Commercial City', lat: 16.5062, lng: 80.6480, zoom: 14 },

  // West Bengal & Eastern India
  { id: 'kolkata', name: 'Kolkata', state: 'West Bengal', type: 'City of Joy', lat: 22.5726, lng: 88.3639, zoom: 13 },
  { id: 'patna', name: 'Patna', state: 'Bihar', type: 'Ancient Pataliputra', lat: 25.5941, lng: 85.1376, zoom: 13 },
  { id: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha', type: 'Temple City', lat: 20.2961, lng: 85.8245, zoom: 13 },
  { id: 'guwahati', name: 'Guwahati', state: 'Assam', type: 'Gateway to Northeast', lat: 26.1445, lng: 91.7362, zoom: 13 },

  // Kerala
  { id: 'kochi', name: 'Kochi (Cochin)', state: 'Kerala', type: 'Queen of Arabian Sea', lat: 9.9312, lng: 76.2673, zoom: 13 },
  { id: 'trivandrum', name: 'Thiruvananthapuram', state: 'Kerala', type: 'Capital City', lat: 8.5241, lng: 76.9366, zoom: 13 },
  { id: 'kozhikode', name: 'Kozhikode (Calicut)', state: 'Kerala', type: 'Malabar Port', lat: 11.2588, lng: 75.7804, zoom: 14 },

  // Gujarat & Rajasthan
  { id: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', type: 'Commercial Capital', lat: 23.0225, lng: 72.5714, zoom: 13 },
  { id: 'surat', name: 'Surat', state: 'Gujarat', type: 'Diamond & Silk City', lat: 21.1702, lng: 72.8311, zoom: 13 },
  { id: 'jaipur', name: 'Jaipur', state: 'Rajasthan', type: 'Pink City', lat: 26.9124, lng: 75.7873, zoom: 13 }
];

export const INDIA_COLLEGES_AND_UNIVERSITIES = [
  {
    id: 'col-tce',
    name: 'Thiagarajar College of Engineering (TCE)',
    category: 'Engineering College',
    city: 'Madurai',
    state: 'Tamil Nadu',
    address: 'Thiruparankundram, Madurai, Tamil Nadu 625015',
    lat: 9.8824,
    lng: 78.0818,
    zoom: 18
  },
  {
    id: 'col-iit-madras',
    name: 'IIT Madras (Indian Institute of Technology)',
    category: 'Institute of National Importance',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Sardar Patel Road, Guindy, Chennai, Tamil Nadu 600036',
    lat: 12.9915,
    lng: 80.2337,
    zoom: 18
  },
  {
    id: 'col-iit-bombay',
    name: 'IIT Bombay',
    category: 'Institute of National Importance',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Powai, Mumbai, Maharashtra 400076',
    lat: 19.1334,
    lng: 72.9133,
    zoom: 18
  },
  {
    id: 'col-iit-delhi',
    name: 'IIT Delhi',
    category: 'Institute of National Importance',
    city: 'New Delhi',
    state: 'Delhi (NCT)',
    address: 'Hauz Khas, New Delhi, Delhi 110016',
    lat: 28.5450,
    lng: 77.1926,
    zoom: 18
  },
  {
    id: 'col-iisc-bangalore',
    name: 'Indian Institute of Science (IISc)',
    category: 'Premier Research Institute',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'CV Raman Rd, Bengaluru, Karnataka 560012',
    lat: 13.0219,
    lng: 77.5671,
    zoom: 18
  },
  {
    id: 'col-anna-univ',
    name: 'Anna University (CEG Campus)',
    category: 'State Technical University',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Sardar Patel Road, Guindy, Chennai, Tamil Nadu 600025',
    lat: 13.0109,
    lng: 80.2354,
    zoom: 18
  },
  {
    id: 'col-nit-trichy',
    name: 'NIT Tiruchirappalli (NITT)',
    category: 'National Institute of Technology',
    city: 'Tiruchirappalli',
    state: 'Tamil Nadu',
    address: 'Tanjore Main Road, Thuvakudi, Trichy, Tamil Nadu 620015',
    lat: 10.7589,
    lng: 78.8132,
    zoom: 18
  },
  {
    id: 'col-psg-tech',
    name: 'PSG College of Technology',
    category: 'Autonomous Engineering College',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    address: 'Peelamedu, Coimbatore, Tamil Nadu 641004',
    lat: 11.0247,
    lng: 77.0028,
    zoom: 18
  },
  {
    id: 'col-bits-pilani',
    name: 'BITS Pilani',
    category: 'Deemed University',
    city: 'Pilani',
    state: 'Rajasthan',
    address: 'Vidya Vihar, Pilani, Rajasthan 333031',
    lat: 28.3639,
    lng: 75.5873,
    zoom: 18
  },
  {
    id: 'col-vit-vellore',
    name: 'Vellore Institute of Technology (VIT)',
    category: 'Deemed University',
    city: 'Vellore',
    state: 'Tamil Nadu',
    address: 'Katpadi, Vellore, Tamil Nadu 632014',
    lat: 12.9692,
    lng: 79.1559,
    zoom: 18
  },
  {
    id: 'col-du-north',
    name: 'Delhi University (North Campus)',
    category: 'Central University',
    city: 'New Delhi',
    state: 'Delhi (NCT)',
    address: 'University Enclave, New Delhi, Delhi 110007',
    lat: 28.6892,
    lng: 77.2096,
    zoom: 18
  },
  {
    id: 'col-st-xaviers-mumbai',
    name: "St. Xavier's College",
    category: 'Autonomous College',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: '5 Mahapalika Marg, Dhobi Talao, Fort, Mumbai 400001',
    lat: 18.9430,
    lng: 72.8315,
    zoom: 18
  },
  {
    id: 'col-mku',
    name: 'Madurai Kamaraj University (MKU)',
    category: 'State University',
    city: 'Madurai',
    state: 'Tamil Nadu',
    address: 'Palkalai Nagar, Madurai, Tamil Nadu 625021',
    lat: 9.9405,
    lng: 78.0076,
    zoom: 18
  },
  {
    id: 'col-american-college',
    name: 'The American College',
    category: 'Historic Arts & Science College',
    city: 'Madurai',
    state: 'Tamil Nadu',
    address: 'Goripalayam, Madurai, Tamil Nadu 625002',
    lat: 9.9272,
    lng: 78.1306,
    zoom: 18
  },
  {
    id: 'col-bhu-varanasi',
    name: 'Banaras Hindu University (BHU)',
    category: 'Central University',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    address: 'Ajgara, Varanasi, Uttar Pradesh 221005',
    lat: 25.2677,
    lng: 82.9913,
    zoom: 18
  },
  {
    id: 'col-jadavpur',
    name: 'Jadavpur University',
    category: 'State University',
    city: 'Kolkata',
    state: 'West Bengal',
    address: '188 Raja S.C. Mallick Road, Kolkata 700032',
    lat: 22.4990,
    lng: 88.3713,
    zoom: 18
  }
];

export const INDIA_SCHOOLS = [
  {
    id: 'sch-kv-madurai',
    name: 'Kendriya Vidyalaya (KV No. 1) Madurai',
    category: 'Central School',
    city: 'Madurai',
    state: 'Tamil Nadu',
    address: 'Narimedu, Madurai, Tamil Nadu 625002',
    lat: 9.9351,
    lng: 78.1362,
    zoom: 18
  },
  {
    id: 'sch-dps-rk-puram',
    name: 'Delhi Public School (DPS) R.K. Puram',
    category: 'Premier Public School',
    city: 'New Delhi',
    state: 'Delhi (NCT)',
    address: 'Sector 12, R.K. Puram, New Delhi 110022',
    lat: 28.5663,
    lng: 77.1764,
    zoom: 18
  },
  {
    id: 'sch-dav-chennai',
    name: 'DAV Boys Senior Secondary School',
    category: 'Senior Secondary School',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Lloyds Road, Gopalapuram, Chennai 600086',
    lat: 13.0532,
    lng: 80.2543,
    zoom: 18
  },
  {
    id: 'sch-st-josephs-bangalore',
    name: "St. Joseph's Boys' High School",
    category: 'Heritage High School',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '27 Museum Road, Shanthala Nagar, Bengaluru 560025',
    lat: 12.9719,
    lng: 77.6019,
    zoom: 18
  },
  {
    id: 'sch-cathedral-mumbai',
    name: 'The Cathedral and John Connon School',
    category: 'Historic Academy',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: '6 Purshottamdas Thakurdas Marg, Fort, Mumbai 400001',
    lat: 18.9322,
    lng: 72.8318,
    zoom: 18
  },
  {
    id: 'sch-modern-delhi',
    name: 'Modern School Barakhamba Road',
    category: 'Heritage Public School',
    city: 'New Delhi',
    state: 'Delhi (NCT)',
    address: 'Barakhamba Road, Connaught Place, New Delhi 110001',
    lat: 28.6276,
    lng: 77.2289,
    zoom: 18
  },
  {
    id: 'sch-bishop-cotton-shimla',
    name: 'Bishop Cotton School Shimla',
    category: 'Boarding School',
    city: 'Shimla',
    state: 'Himachal Pradesh',
    address: 'Shimla Bypass, Khalini, Shimla 171002',
    lat: 31.1042,
    lng: 77.1710,
    zoom: 18
  },
  {
    id: 'sch-tvs-madurai',
    name: 'TVS Matriculation Higher Secondary School',
    category: 'Matriculation School',
    city: 'Madurai',
    state: 'Tamil Nadu',
    address: 'TVS Nagar, Madurai, Tamil Nadu 625003',
    lat: 9.9078,
    lng: 78.0934,
    zoom: 18
  },
  {
    id: 'sch-don-bosco-chennai',
    name: 'Don Bosco Matriculation School',
    category: 'Secondary School',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: '130 Casa Major Road, Egmore, Chennai 600008',
    lat: 13.0768,
    lng: 80.2589,
    zoom: 18
  }
];

export const INDIA_STREETS_AND_AVENUES = [
  {
    id: 'str-mg-road-blr',
    name: 'MG Road (Mahatma Gandhi Road)',
    category: 'Commercial Boulevard & Metro Hub',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Mahatma Gandhi Road, Central Bengaluru, Karnataka 560001',
    lat: 12.9756,
    lng: 77.6066,
    zoom: 18
  },
  {
    id: 'str-brigade-road',
    name: 'Brigade Road',
    category: 'High-Density Shopping Street',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Brigade Road, Shanthala Nagar, Ashok Nagar, Bengaluru 560025',
    lat: 12.9734,
    lng: 77.6074,
    zoom: 18
  },
  {
    id: 'str-marine-drive',
    name: 'Marine Drive (Queen’s Necklace Promenade)',
    category: 'Coastal Promenade & Boulevard',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Netaji Subhash Chandra Bose Road, Churchgate, Mumbai 400020',
    lat: 18.9432,
    lng: 72.8230,
    zoom: 18
  },
  {
    id: 'str-connaught-place',
    name: 'Connaught Place (Inner & Outer Circle)',
    category: 'Heritage Financial & Commercial District',
    city: 'New Delhi',
    state: 'Delhi (NCT)',
    address: 'Connaught Place, Central Delhi, New Delhi 110001',
    lat: 28.6328,
    lng: 77.2197,
    zoom: 18
  },
  {
    id: 'str-ranganathan-street',
    name: 'Ranganathan Street (T. Nagar)',
    category: 'Peak Crowded Pedestrian Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Ranganathan Street, Thyagaraya Nagar, Chennai 600017',
    lat: 13.0405,
    lng: 80.2307,
    zoom: 19
  },
  {
    id: 'str-anna-salai',
    name: 'Anna Salai (Mount Road)',
    category: 'Major Arterial Highway',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'Anna Salai, Thousand Lights / Teynampet, Chennai 600002',
    lat: 13.0604,
    lng: 80.2496,
    zoom: 18
  },
  {
    id: 'str-south-masi-street',
    name: 'South Masi Street (Meenakshi Amman Temple Ring)',
    category: 'Historic Temple Commercial Street',
    city: 'Madurai',
    state: 'Tamil Nadu',
    address: 'South Masi Street, Periyar Bus Stand Area, Madurai 625001',
    lat: 9.9174,
    lng: 78.1172,
    zoom: 18
  },
  {
    id: 'str-cross-cut-road',
    name: 'Cross Cut Road (Gandhipuram)',
    category: 'Commercial Hub',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    address: 'Cross Cut Road, Gandhipuram, Coimbatore 641012',
    lat: 11.0183,
    lng: 76.9678,
    zoom: 18
  },
  {
    id: 'str-park-street-kolkata',
    name: 'Park Street (Mother Teresa Sarani)',
    category: 'Dining & Heritage High Street',
    city: 'Kolkata',
    state: 'West Bengal',
    address: 'Park Street, Mullick Bazar, Park Street area, Kolkata 700016',
    lat: 22.5516,
    lng: 88.3524,
    zoom: 18
  },
  {
    id: 'str-linking-road-mumbai',
    name: 'Linking Road (Bandra West)',
    category: 'Retail & Fashion Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Linking Road, Bandra West, Mumbai 400050',
    lat: 19.0607,
    lng: 72.8336,
    zoom: 18
  },
  {
    id: 'str-fc-road-pune',
    name: 'Fergusson College (FC) Road',
    category: 'Youth & Academic Commercial Street',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Fergusson College Road, Shivajinagar, Pune 411004',
    lat: 18.5226,
    lng: 73.8415,
    zoom: 18
  },
  {
    id: 'str-hazratganj-lucknow',
    name: 'Hazratganj Main Promenade',
    category: 'Historic Shopping & Stroll Promenade',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    address: 'Hazratganj, Lucknow, Uttar Pradesh 226001',
    lat: 26.8526,
    lng: 80.9427,
    zoom: 18
  },
  {
    id: 'str-johari-bazaar',
    name: 'Johari Bazaar (Pink City)',
    category: 'Historic Gem & Jewelry Bazaar',
    city: 'Jaipur',
    state: 'Rajasthan',
    address: 'Johari Bazar, Badi Choupad, Pink City, Jaipur 302003',
    lat: 26.9205,
    lng: 75.8276,
    zoom: 18
  }
];
