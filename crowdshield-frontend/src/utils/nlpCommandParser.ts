export interface NLPCommandResult {
  action: string;
  target: string;
  message: string;
}

export const parseVoiceCommand = (transcript: string): NLPCommandResult | null => {
  const lowerTranscript = transcript.toLowerCase();

  // Pattern 1: Unlock Gate/Auxiliary
  if (lowerTranscript.includes('unlock') && (lowerTranscript.includes('gate 4') || lowerTranscript.includes('auxiliary 4'))) {
    return {
      action: 'UNLOCK_GATE',
      target: 'GATE_4',
      message: 'Unlocking Gate 4 (Auxiliary West Gate)'
    };
  }
  
  if (lowerTranscript.includes('unlock') && (lowerTranscript.includes('gate 3') || lowerTranscript.includes('south gate'))) {
    return {
      action: 'UNLOCK_GATE',
      target: 'GATE_3',
      message: 'Unlocking Gate 3 (South Gate)'
    };
  }

  // Pattern 2: Dispatch Broadcast
  if (lowerTranscript.includes('dispatch') && lowerTranscript.includes('broadcast')) {
    return {
      action: 'DISPATCH_BROADCAST',
      target: 'SECTOR_ALL',
      message: 'Dispatching Emergency Cell Broadcast to all sectors'
    };
  }

  return null;
};
