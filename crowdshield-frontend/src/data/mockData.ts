import { VenueZone, CCTVFeed, CrowdAlert, CitizenReport, VenueInfo, BhashiniTranslation, SupportedLanguage } from '../types';

// These remain empty because your FastAPI backend is now serving the real Venues and Zones!
export const INITIAL_VENUES: VenueInfo[] = [];
export const INITIAL_ZONES: VenueZone[] = [];
export const INITIAL_ALERTS: CrowdAlert[] = [];

// ALL cameras for ALL venues live here. The UI will filter them automatically.
export const INITIAL_CCTV_FEEDS: CCTVFeed[] = [
  // --- ITER CAMPUS CAMERAS ---
  {
    id: 'cam_01',
    name: 'CAM-01: Main Gate',
    location: 'Main Gate (gate_1)',
    zoneId: 'gate_1',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5000/video_feed',
    edgeNodeId: 'EDGE-DL-03',
    yoloDetections: [
      { id: 'd1', label: 'Person 0.96', confidence: 0.96, bbox: { x: 15, y: 25, width: 12, height: 28 }, type: 'person' },
      { id: 'd2', label: 'Person 0.94', confidence: 0.94, bbox: { x: 30, y: 35, width: 14, height: 32 }, type: 'person' }
    ]
  },
  {
    id: 'cam_02',
    name: 'CAM-02: Library Roundabout',
    location: 'Central Library Roundabout (zone_library_roundabout)',
    zoneId: 'zone_library_roundabout',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5001/video_feed',
    edgeNodeId: 'EDGE-DL-01',
    yoloDetections: [
      { id: 'd5', label: 'Person 0.98', confidence: 0.98, bbox: { x: 20, y: 40, width: 10, height: 25 }, type: 'person' },
      { id: 'd6', label: 'Person 0.95', confidence: 0.95, bbox: { x: 45, y: 30, width: 12, height: 30 }, type: 'person' }
    ]
  },
  {
    id: 'cam_03',
    name: 'CAM-03: Sports Complex Rd',
    location: 'Sports Complex Road (zone_sports_complex_rd)',
    zoneId: 'zone_sports_complex_rd',
    status: 'online',
    fps: 28,
    personCount: 0,
    imageUrl: 'http://localhost:5002/video_feed',
    edgeNodeId: 'EDGE-DL-02',
    yoloDetections: [
      { id: 'd7', label: 'CONGESTION NODE', confidence: 0.88, bbox: { x: 25, y: 35, width: 35, height: 45 }, type: 'backlog' }
    ]
  },
  {
    id: 'cam_04',
    name: 'CAM-04: E Block Lawn',
    location: 'E Block Lawn (zone_e_block_lawn_rd)',
    zoneId: 'zone_e_block_lawn_rd',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5003/video_feed',
    edgeNodeId: 'EDGE-DL-04',
    yoloDetections: [
      { id: 'd8', label: 'Person 0.97', confidence: 0.97, bbox: { x: 60, y: 40, width: 10, height: 22 }, type: 'person' }
    ]
  },
  {
    id: 'cam_05',
    name: 'CAM-05: Admin Block Approach',
    location: 'Administrative Block Road (zone_admin_block_rd)',
    zoneId: 'zone_admin_block_rd',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5004/video_feed',
    edgeNodeId: 'EDGE-DL-05',
    yoloDetections: [
      { id: 'd3', label: 'BACKLOG NODE (4.8 p/m²)', confidence: 0.99, bbox: { x: 50, y: 20, width: 40, height: 60 }, type: 'backlog' },
      { id: 'd4', label: 'VELOCITY SLOW (0.2m/s)', confidence: 0.91, bbox: { x: 55, y: 65, width: 30, height: 25 }, type: 'velocity_anomaly' }
    ]
  },
  {
    id: 'cam_06',
    name: 'CAM-06: Back Gate',
    location: 'Exit Gate / Food Court (gate_2)',
    zoneId: 'gate_2',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5005/video_feed',
    edgeNodeId: 'EDGE-DL-06',
    yoloDetections: [
      { id: 'd9', label: 'Person 0.92', confidence: 0.92, bbox: { x: 10, y: 30, width: 15, height: 25 }, type: 'person' }
    ]
  },

  // --- KALINGA STADIUM CAMERAS ---
 // --- KALINGA STADIUM CAMERAS (6 Zones = 6 Cameras) ---
  {
    id: 'ks_cam_01',
    name: 'CAM-01: Gate 3',
    location: 'Gate 3 (Main Entrance)',
    zoneId: 'ks_gate_3',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5000/video_feed',
    edgeNodeId: 'EDGE-KS-01',
    yoloDetections: [
      { id: 'kd1', label: 'Person 0.95', confidence: 0.95, bbox: { x: 20, y: 30, width: 12, height: 28 }, type: 'person' }
    ]
  },
  {
    id: 'ks_cam_02',
    name: 'CAM-02: Sky Walk',
    location: 'Sky Walk',
    zoneId: 'ks_sky_walk',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5001/video_feed',
    edgeNodeId: 'EDGE-KS-02',
    yoloDetections: [
      { id: 'kd2', label: 'Person 0.98', confidence: 0.98, bbox: { x: 40, y: 20, width: 10, height: 22 }, type: 'person' }
    ]
  },
  {
    id: 'ks_cam_03',
    name: 'CAM-03: Hockey Stadium',
    location: 'Hockey stadium entrance',
    zoneId: 'ks_swimming',
    status: 'online',
    fps: 28,
    personCount: 0,
    imageUrl: 'http://localhost:5002/video_feed',
    edgeNodeId: 'EDGE-KS-03',
    yoloDetections: []
  },
  {
    id: 'ks_cam_04',
    name: 'CAM-04: Athletics Ent',
    location: 'Atheletics Entrance',
    zoneId: 'ks_athletics',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5003/video_feed',
    edgeNodeId: 'EDGE-KS-04',
    yoloDetections: []
  },
  {
    id: 'ks_cam_05',
    name: 'CAM-05: Gate 8B Parking',
    location: 'Gate 8B (Way to parking)',
    zoneId: 'ks_parking',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5004/video_feed',
    edgeNodeId: 'EDGE-KS-05',
    yoloDetections: []
  },
  {
    id: 'ks_cam_06',
    name: 'CAM-06: Badminton Jct',
    location: 'Badminton stadium junction',
    zoneId: 'ks_badminton',
    status: 'online',
    fps: 30,
    personCount: 0,
    imageUrl: 'http://localhost:5005/video_feed',
    edgeNodeId: 'EDGE-KS-06',
    yoloDetections: []
  }
];

export const BHASHINI_TRANSLATIONS: Record<SupportedLanguage, BhashiniTranslation> = {
  en: {
    lang: 'en',
    langName: 'English',
    announcementText: 'Attention visitors in West Exit Sector. Gate 3 is congested. Please move calmly towards Emergency Exit Gate 4 on your right for a safe and smooth exit.',
    audioDurationSec: 8
  },
  hi: {
    lang: 'hi',
    langName: 'Hindi (हिंदी)',
    announcementText: 'कृपया ध्यान दें! पश्चिम निकास द्वार 3 पर भीड़ अधिक है। शांति बनाए रखें और अपने दाहिनी ओर आपातकालीन द्वार 4 की तरफ बढ़ें।',
    audioDurationSec: 9
  },
  od: {
    lang: 'od',
    langName: 'Odia (ଓଡ଼ିଆ)',
    announcementText: 'ଧ୍ୟାନ ଦିଅନ୍ତୁ! ପଶ୍ଚିମ ପ୍ରସ୍ଥାନ ଦ୍ୱାର ୩ ରେ ପ୍ରବଳ ଭିଡ଼ ଅଛି। ଦୟାକରି ଶାନ୍ତ ରୁହନ୍ତୁ ଏବଂ ଡାହାଣ ପାଖରେ ଥିବା ଆପାତକାଳୀନ ଦ୍ୱାର ୪ କୁ ଯାଆନ୍ତୁ।',
    audioDurationSec: 10
  },
  bn: {
    lang: 'bn',
    langName: 'Bengali (বাংলা)',
    announcementText: 'বিশেষ সতর্কবার্তা! পশ্চিম এক্সিট গেট ৩-এ ভিড় বেশি। অনুগ্রহ করে শান্ত থাকুন এবং ডানদিকের জরুরি গেট ৪-এর দিকে যান।',
    audioDurationSec: 9
  },
  ta: {
    lang: 'ta',
    langName: 'Tamil (தமிழ்)',
    announcementText: 'கவனத்திற்கு! மேற்கு வெளியேறும் வாயில் 3-ல் கூட்டம் அதிகமாக உள்ளது. அமைதியாக வலதுபுறம் உள்ள அவசர வாயில் 4-ஐ நோக்கிச் செல்லவும்.',
    audioDurationSec: 10
  }
};

export const INITIAL_CITIZEN_REPORTS: CitizenReport[] = [
  {
    id: 'rep_101',
    category: 'Overcrowding',
    location: 'West Exit Gate 3 Stairs',
    description: 'Heavy pushing near the ticket turnstiles. Stoppage for past 5 minutes.',
    timestamp: '04:46:12',
    status: 'dispatched',
    upvotes: 18,
    photoUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400&auto=format&fit=crop'
  },
  {
    id: 'rep_102',
    category: 'Hazard',
    location: 'South Concourse Pillar 12',
    description: 'Fallen metal barricade blocking the central walkway.',
    timestamp: '04:40:05',
    status: 'pending',
    upvotes: 7,
    photoUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=400&auto=format&fit=crop'
  }
];

export const PREDICTIVE_TREND_DATA = [
  { time: '04:30', current: 1.8, predicted: 1.8, threshold: 4.0 },
  { time: '04:35', current: 2.1, predicted: 2.2, threshold: 4.0 },
  { time: '04:40', current: 2.8, predicted: 3.0, threshold: 4.0 },
  { time: '04:45', current: 3.6, predicted: 3.9, threshold: 4.0 },
  { time: '04:50', current: 4.8, predicted: 5.4, threshold: 4.0 },
  { time: '04:55 (Predict)', current: null, predicted: 5.8, threshold: 4.0 },
  { time: '05:00 (Predict)', current: null, predicted: 4.2, threshold: 4.0 },
  { time: '05:05 (Predict)', current: null, predicted: 2.5, threshold: 4.0 }
];

export const HISTORICAL_FOOTFALL_DATA = [
  { hour: '12:00', footfall: 3200, bottlenecks: 0 },
  { hour: '13:00', footfall: 5400, bottlenecks: 1 },
  { hour: '14:00', footfall: 8900, bottlenecks: 1 },
  { hour: '15:00', footfall: 14200, bottlenecks: 3 },
  { hour: '16:00', footfall: 18500, bottlenecks: 5 },
  { hour: '17:00', footfall: 12450, bottlenecks: 3 },
  { hour: '18:00 (Est)', footfall: 9100, bottlenecks: 2 }
];