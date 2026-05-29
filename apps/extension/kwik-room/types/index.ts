export type Message = {
  id: number;
  username: string;
  text: string;
  createdAt: string;
  
  type?: "chat" | "game_invite" | "game_state"; 
  
  metadata?: {                                 
    // 👉 FIX: Added four_in_a_row to the allowed game types
    gameType?: "tic_tac_toe" | "four_in_a_row";
    gameInstanceId?: string;
    playersJoined?: string[];
    maxPlayers?: number;
    gameState?: any; 
    expired?: boolean;
  };
};