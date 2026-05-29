export type Message = {
  id: number;
  username: string;
  text: string;
  createdAt: string;
  
  // 👉 NEW: Categorize the message 
  type?: "chat" | "game_invite" | "game_state"; 
  
  // 👉 NEW: Flexible game data payload
  metadata?: {                                 
    gameType?: "tic_tac_toe";
    gameInstanceId?: string;
    playersJoined?: string[];
    maxPlayers?: number;
    gameState?: any; // We will use this to pass the board layout later
    expired?: boolean;
  };
};