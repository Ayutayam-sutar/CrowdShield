import { VenueZone, CCTVFeed, CrowdAlert, CitizenReport, VenueInfo, BhashiniTranslation, SupportedLanguage } from '../types';

export const INITIAL_VENUES: VenueInfo[] = [
  {
    id: 'venue_jns',
    name: 'Jawaharlal Nehru Stadium · Sector 7G',
    location: 'New Delhi, Delhi',
    centerCoords: [28.5833, 77.2333],
    totalCapacity: 60000,
    currentTotalHeadcount: 12450,
    activeZonesCount: 12,
    affectedZonesCount: 3,
  },
  {
    id: 'venue_kfg',
    name: 'Kalinga Festival Ground · Gate 3-9',
    location: 'Bhubaneswar, Odisha',
    centerCoords: [20.2961, 85.8245],
    totalCapacity: 45000,
    currentTotalHeadcount: 28900,
    activeZonesCount: 10,
    affectedZonesCount: 1,
  },
  {
    id: 'venue_cst',
    name: 'Chhatrapati Shivaji Terminal Plaza',
    location: 'Mumbai, Maharashtra',
    centerCoords: [18.9400, 72.8353],
    totalCapacity: 80000,
    currentTotalHeadcount: 54200,
    activeZonesCount: 16,
    affectedZonesCount: 4,
  }
];

export const INITIAL_ZONES: VenueZone[] = [
  {
    id: 'zone_north_plaza',
    name: 'North Plaza Entry',
    code: 'Z-01',
    sector: 'Sector Alpha',
    density: 1.8,
    maxCapacity: 5000,
    currentHeadcount: 2150,
    flowRate: 34,
    riskScore: 24,
    riskLevel: 'safe',
    trend: 'stable',
    center: [28.5845, 77.2335],
    polygon: [
      [28.5842, 77.2325],
      [28.5852, 77.2338],
      [28.5845, 77.2348],
      [28.5836, 77.2335]
    ],
    gateStatus: 'open'
  },
  {
    id: 'zone_west_exit',
    name: 'West Exit Gate 3',
    code: 'Z-03',
    sector: 'Sector Bravo',
    density: 4.8,
    maxCapacity: 3500,
    currentHeadcount: 3200,
    flowRate: 12,
    riskScore: 87,
    riskLevel: 'critical',
    trend: 'up',
    center: [28.5832, 77.2318],
    polygon: [
      [28.5836, 77.2310],
      [28.5842, 77.2322],
      [28.5828, 77.2326],
      [28.5822, 77.2314]
    ],
    gateStatus: 'restricted'
  },
  {
    id: 'zone_south_concourse',
    name: 'South Concourse Hub',
    code: 'Z-02',
    sector: 'Sector Charlie',
    density: 3.4,
    maxCapacity: 4500,
    currentHeadcount: 3800,
    flowRate: 22,
    riskScore: 68,
    riskLevel: 'warning',
    trend: 'up',
    center: [28.5818, 77.2335],
    polygon: [
      [28.5818, 77.2326],
      [28.5825, 77.2342],
      [28.5813, 77.2348],
      [28.5806, 77.2332]
    ],
    gateStatus: 'open'
  },
  {
    id: 'zone_east_stand',
    name: 'East Stand Gate 1',
    code: 'Z-04',
    sector: 'Sector Delta',
    density: 2.6,
    maxCapacity: 6000,
    currentHeadcount: 2900,
    flowRate: 48,
    riskScore: 42,
    riskLevel: 'caution',
    trend: 'down',
    center: [28.5838, 77.2350],
    polygon: [
      [28.5830, 77.2345],
      [28.5838, 77.2358],
      [28.5848, 77.2350],
      [28.5840, 77.2338]
    ],
    gateStatus: 'open'
  },
  {
    id: 'zone_main_arena',
    name: 'Main Central Pavilion',
    code: 'Z-05',
    sector: 'Sector Echo',
    density: 1.2,
    maxCapacity: 15000,
    currentHeadcount: 4000,
    flowRate: 60,
    riskScore: 18,
    riskLevel: 'safe',
    trend: 'stable',
    center: [28.5833, 77.2333],
    polygon: [
      [28.5826, 77.2326],
      [28.5839, 77.2326],
      [28.5839, 77.2340],
      [28.5826, 77.2340]
    ],
    gateStatus: 'open'
  }
];

export const INITIAL_CCTV_FEEDS: CCTVFeed[] = [
  {
    id: 'cam_01',
    name: 'CAM-01: West Exit Turnstile',
    location: 'West Exit Gate 3 (Zone Z-03)',
    zoneId: 'zone_west_exit',
    status: 'online',
    fps: 30,
    personCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop',
    edgeNodeId: 'EDGE-DL-03',
    yoloDetections: [
      { id: 'd1', label: 'Person 0.96', confidence: 0.96, bbox: { x: 15, y: 25, width: 12, height: 28 }, type: 'person' },
      { id: 'd2', label: 'Person 0.94', confidence: 0.94, bbox: { x: 30, y: 35, width: 14, height: 32 }, type: 'person' },
      { id: 'd3', label: 'BACKLOG NODE (4.8 p/m²)', confidence: 0.99, bbox: { x: 50, y: 20, width: 40, height: 60 }, type: 'backlog' },
      { id: 'd4', label: 'VELOCITY SLOW (0.2m/s)', confidence: 0.91, bbox: { x: 55, y: 65, width: 30, height: 25 }, type: 'velocity_anomaly' }
    ]
  },
  {
    id: 'cam_02',
    name: 'CAM-02: North Plaza Entrance',
    location: 'North Plaza (Zone Z-01)',
    zoneId: 'zone_north_plaza',
    status: 'online',
    fps: 30,
    personCount: 68,
    imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000&auto=format&fit=crop',
    edgeNodeId: 'EDGE-DL-01',
    yoloDetections: [
      { id: 'd5', label: 'Person 0.98', confidence: 0.98, bbox: { x: 20, y: 40, width: 10, height: 25 }, type: 'person' },
      { id: 'd6', label: 'Person 0.95', confidence: 0.95, bbox: { x: 45, y: 30, width: 12, height: 30 }, type: 'person' }
    ]
  },
  {
    id: 'cam_03',
    name: 'CAM-03: South Concourse Ramp',
    location: 'South Concourse (Zone Z-02)',
    zoneId: 'zone_south_concourse',
    status: 'online',
    fps: 28,
    personCount: 110,
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1000&auto=format&fit=crop',
    edgeNodeId: 'EDGE-DL-02',
    yoloDetections: [
      { id: 'd7', label: 'CONGESTION NODE', confidence: 0.88, bbox: { x: 25, y: 35, width: 35, height: 45 }, type: 'backlog' }
    ]
  },
  {
    id: 'cam_04',
    name: 'CAM-04: East Stand Gate 1',
    location: 'East Stand (Zone Z-04)',
    zoneId: 'zone_east_stand',
    status: 'online',
    fps: 30,
    personCount: 84,
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop',
    edgeNodeId: 'EDGE-DL-04',
    yoloDetections: [
      { id: 'd8', label: 'Person 0.97', confidence: 0.97, bbox: { x: 60, y: 40, width: 10, height: 22 }, type: 'person' }
    ]
  }
];

export const INITIAL_ALERTS: CrowdAlert[] = [
  {
    id: 'CG-8924',
    title: 'West Exit Gate 3 Overcrowding Bottleneck',
    zoneId: 'zone_west_exit',
    zoneName: 'West Exit Gate 3',
    riskLevel: 'critical',
    density: 4.8,
    flowRate: 12,
    timestamp: '04:48:10 (2 mins ago)',
    category: 'Gate Bottleneck',
    status: 'active',
    sentinelAnalysis: 'Density at West Exit Gate 3 has surged 45% in the last 10 minutes. Turnstile egress capacity is reduced by 60% due to single-stream exiting. High crushing force probability (>4.0 p/m²) detected near barrier wall.',
    recommendedActions: [
      {
        id: 'rec_1',
        actionText: 'Open Emergency Auxiliary Exit Gate 4 immediately',
        impact: 'Reduces Gate 3 density by ~40% within 3 mins',
        targetGateOrZone: 'Gate 4'
      },
      {
        id: 'rec_2',
        actionText: 'Reroute incoming crowd from South Concourse to East Stand (Zone Z-04)',
        impact: 'Prevents further backlog inflow into Sector Bravo',
        targetGateOrZone: 'Zone Z-04'
      },
      {
        id: 'rec_3',
        actionText: 'Trigger Bhashini Multilingual PA Announcement in Hindi & Odia',
        impact: 'Calms crowd & directs movement toward clear exits',
        targetGateOrZone: 'PA System Sector Bravo'
      }
    ]
  },
  {
    id: 'CG-8923',
    title: 'South Concourse Flow Stagnation',
    zoneId: 'zone_south_concourse',
    zoneName: 'South Concourse Hub',
    riskLevel: 'warning',
    density: 3.4,
    flowRate: 22,
    timestamp: '04:45:00 (5 mins ago)',
    category: 'Sudden Surge',
    status: 'investigating',
    sentinelAnalysis: 'Pedestrian flow velocity dropped from 1.6 m/s to 0.4 m/s. People accumulating near central food court exit. Early signs of bidirectional crowd conflict.',
    recommendedActions: [
      {
        id: 'rec_4',
        actionText: 'Deploy Quick Response Security Unit Bravo (4 Personnel)',
        impact: 'Establishes one-way pedestrian walking lanes',
        targetGateOrZone: 'Zone Z-02'
      }
    ]
  },
  {
    id: 'CG-8920',
    title: 'Optical LiDAR Edge Sensor #04 Signal Jitter',
    zoneId: 'zone_east_stand',
    zoneName: 'East Stand Gate 1',
    riskLevel: 'caution',
    density: 2.6,
    flowRate: 48,
    timestamp: '04:30:00 (20 mins ago)',
    category: 'Sensor Anomaly',
    status: 'resolved',
    sentinelAnalysis: 'LiDAR Sensor #04 reported 2 lost data packets during peak frame capture. Fallback camera AI cross-validation activated automatically with 99.1% confidence.',
    recommendedActions: [
      {
        id: 'rec_5',
        actionText: 'Restart Edge Node #04 Daemon',
        impact: 'Restores primary LiDAR sensor sync',
        targetGateOrZone: 'Edge Node 04'
      }
    ]
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
  { time: '04:50', current: 4.8, predicted: 5.4, threshold: 4.0 }, // Surge
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
