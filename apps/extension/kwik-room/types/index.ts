export type Message = {
  id: number;
  username: string;
  text: string;
  createdAt: string;
  type?: "chat" | "game_invite" | "game_state"; 
  metadata?: {                                 
    // 👉 FIX: Added the_spy to allowed game types
    gameType?: "tic_tac_toe" | "four_in_a_row" | "word_guess" | "scribble_it" | "the_spy" | "typing_battle";
    gameInstanceId?: string;
    playersJoined?: string[];
    maxPlayers?: number;
    gameState?: any; 
    expired?: boolean;
    isBot?: boolean; 
    isAiInteraction?: boolean;
  };
};