import React, { useState, useEffect } from 'react';
import { useGame } from './game/GameContext';
import PlayerPanel from './components/PlayerPanel';
import PhaseBar from './components/PhaseBar';
import BattleControls from './components/BattleControls';
import BattleHand from './components/BattleHand';

type ActiveTab = 'shop' | 'collection' | 'match' | 'modes';
type CardVariant = 'base' | 'foil' | 'gold';

interface UserAccount {
  username: string;
  rank: number;
  credits: number;
  gold: number;
  battlePoints: number;
  unlockedCardIds: string[];
  unlockedVariants: Record<string, CardVariant[]>;
  activeDeckCardIds: string[];
  towerFloor: number;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  highestTowerFloorReached: number;
  totalBattlePointsEarned: number;
}

interface TowerOpponent {
  id: string;
  name: string;
  basePower: number;
  scaledPower: number;
  type: string;
}

const playAudioSFX = (type: 'click' | 'purchase' | 'matchmaking' | 'success' | 'fail') => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'click') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'purchase') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'matchmaking') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (error) {
    console.error("Audio Synthesis Interrupted:", error);
  }
};

export default function App() {
  const { gameState, localPlayerId } = useGame();
  
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [currentTab, setCurrentTab] = useState<ActiveTab>('match');
  const [inBattleMode, setInBattleMode] = useState<boolean>(false);
  const [battleType, setBattleModeType] = useState<'standard' | 'tower'>('standard');
  const [matchmakingState, setMatchmakingState] = useState<'idle' | 'searching' | 'countdown'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  const [activeBoss, setActiveBoss] = useState<TowerOpponent | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeVariantView, setActiveVariantView] = useState<Record<string, CardVariant>>({});

  const cardList = gameState.config?.cards || [];

  useEffect(() => {
    const activeSession = localStorage.getItem('pk_active_user');
    if (activeSession) {
      const storedUserData = localStorage.getItem(`pk_user_${activeSession}`);
      if (storedUserData) setUser(JSON.parse(storedUserData));
    }
  }, []);

  const saveUserData = (updatedProfile: UserAccount) => {
    setUser(updatedProfile);
    localStorage.setItem(`pk_user_${updatedProfile.username}`, JSON.stringify(updatedProfile));
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput.trim()) return setAuthError('Username required');

    if (authMode === 'register') {
      const checkUserFile = localStorage.getItem(`pk_user_${usernameInput}`);
      if (checkUserFile) return setAuthError('Username already taken');

      const newAccountFile: UserAccount = {
        username: usernameInput.trim(),
        rank: 1,
        credits: 500,
        gold: 400,
        battlePoints: 200,
        unlockedCardIds: ['hdm-001', 'hdm-002', 'hdm-003'],
        unlockedVariants: {
          'hdm-001': ['base'],
          'hdm-002': ['base'],
          'hdm-003': ['base'],
        },
        activeDeckCardIds: ['hdm-001', 'hdm-002', 'hdm-003'],
        towerFloor: 1,
        totalMatchesPlayed: 0,
        totalMatchesWon: 0,
        highestTowerFloorReached: 1,
        totalBattlePointsEarned: 200
      };

      localStorage.setItem(`pk_user_${usernameInput}`, JSON.stringify(newAccountFile));
      localStorage.setItem('pk_active_user', usernameInput);
      setUser(newAccountFile);
      playAudioSFX('success');
    } else {
      const loadedProfile = localStorage.getItem(`pk_user_${usernameInput}`);
      if (!loadedProfile) return setAuthError('User account profile not found');
      
      localStorage.setItem('pk_active_user', usernameInput);
      setUser(JSON.parse(loadedProfile));
      playAudioSFX('success');
    }
  };

  const handleLogout = () => {
    playAudioSFX('click');
    localStorage.removeItem('pk_active_user');
    setUser(null);
    setInBattleMode(false);
  };

  const triggerMatchmaking = (type: 'standard' | 'tower') => {
    playAudioSFX('click');
    setBattleModeType(type);
    setMatchmakingState('searching');

    if (type === 'tower' && user) {
      const tamerCards = cardList.filter(card => card.type?.toLowerCase() === 'tamer');
      if (tamerCards.length > 0) {
        const randomTamer = tamerCards[Math.floor(Math.random() * tamerCards.length)];
        const scaleFactor = 1 + (user.towerFloor * 0.2);
        setActiveBoss({
          id: randomTamer.id,
          name: randomTamer.name,
          basePower: randomTamer.power || 1,
          scaledPower: Math.floor((randomTamer.power || 1) * scaleFactor),
          type: 'Tamer Card Encounter'
        });
      } else {
        setActiveBoss({
          id: 'boss-generic',
          name: `Rival Tamer (Floor ${user.towerFloor})`,
          basePower: 5,
          scaledPower: Math.floor(5 * (1 + (user.towerFloor * 0.2))),
          type: 'Tamer Card Encounter'
        });
      }
    } else {
      setActiveBoss(null);
    }

    setTimeout(() => {
      setMatchmakingState('countdown');
      playAudioSFX('matchmaking');
      let count = 3;
      setCountdown(count);
      const timerLoop = setInterval(() => {
        count--;
        setCountdown(count);
        if (count > 0) playAudioSFX('matchmaking');
        if (count === 0) {
          clearInterval(timerLoop);
          setMatchmakingState('idle');
          setInBattleMode(true);
        }
      }, 1000);
    }, 2000);
  };

  const executeEndMatch = (didWin: boolean) => {
    if (!user) return;
    didWin ? playAudioSFX('success') : playAudioSFX('fail');

    let bpBounty = didWin ? 150 : 50;
    let floorMutation = user.towerFloor;

    if (battleType === 'tower') {
      const tierMultiplier = 1 + (user.towerFloor * 0.3);
      bpBounty = Math.floor((didWin ? 250 : 30) * tierMultiplier);
      floorMutation = didWin ? user.towerFloor + 1 : 1;
    }

    const compiledProfile: UserAccount = {
      ...user,
      battlePoints: user.battlePoints + bpBounty,
      credits: user.credits + (didWin ? 100 : 30),
      towerFloor: floorMutation,
      totalMatchesPlayed: user.totalMatchesPlayed + 1,
      totalMatchesWon: user.totalMatchesWon + (didWin ? 1 : 0),
      totalBattlePointsEarned: user.totalBattlePointsEarned + bpBounty,
      highestTowerFloorReached: Math.max(user.highestTowerFloorReached, floorMutation)
    };

    saveUserData(compiledProfile);
    setActiveBoss(null);
    setInBattleMode(false);
  };

  const processPurchase = (targetId: string, type: 'base' | 'foil' | 'gold', cost: number, currency: 'bp' | 'gold') => {
    playAudioSFX('click');
    if (!user) return;
    if (currency === 'bp' && user.battlePoints < cost) return alert('Insufficient Battle Points (BP)!');
    if (currency === 'gold' && user.gold < cost) return alert('Insufficient Gold Premium Credits!');

    const nextVariants = { ...user.unlockedVariants };
    const nextCards = [...user.unlockedCardIds];

    if (type === 'base') {
      if (nextCards.includes(targetId)) return;
      nextCards.push(targetId);
      nextVariants[targetId] = ['base'];
    } else {
      if (!nextVariants[targetId]) nextVariants[targetId] = ['base'];
      if (nextVariants[targetId].includes(type)) return;
      nextVariants[targetId].push(type);
    }

    const synchronizedProfile: UserAccount = {
      ...user,
      battlePoints: currency === 'bp' ? user.battlePoints - cost : user.battlePoints,
      gold: currency === 'gold' ? user.gold - cost : user.gold,
      unlockedCardIds: nextCards,
      unlockedVariants: nextVariants
    };

    saveUserData(synchronizedProfile);
    playAudioSFX('purchase');
  };

  const toggleDeckSlot = (cardId: string) => {
    playAudioSFX('click');
    if (!user) return;
    const workingSlots = [...user.activeDeckCardIds];
    const itemIndex = workingSlots.indexOf(cardId);

    if (itemIndex > -1) {
      workingSlots.splice(itemIndex, 1);
    } else {
      if (workingSlots.length >= 12) return alert('Your active selection deck size is already at a maximum capacity of 12 cards!');
      workingSlots.push(cardId);
    }

    saveUserData({ ...user, activeDeckCardIds: workingSlots });
  };

  const selectTab = (tab: ActiveTab) => {
    playAudioSFX('click');
    setCurrentTab(tab);
    setSelectedCardId(null);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center w-full min-h-screen bg-slate-950 font-sans text-white p-4 antialiased">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="text-3xl">🎴</div>
            <h2 className="text-xl font-black tracking-wider text-purple-400 uppercase">Arena Account Link</h2>
            <p className="text-xs text-slate-400 font-medium">Create a local account profile node to authorize instant gameplay auto-saving matrices.</p>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Player Handle</label>
              <input 
                type="text" 
                value={usernameInput} 
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="PLAYER_ONE"
              />
            </div>
            {authError && <p className="text-xs font-bold text-red-500 tracking-wide text-center">⚠️ {authError}</p>}
            <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 font-black text-sm py-3 rounded-xl uppercase tracking-widest transition-colors border-t border-purple-400 shadow-lg shadow-purple-900/30">
              {authMode === 'login' ? 'Sync Profile' : 'Generate Account Row'}
            </button>
          </form>
          <div className="text-center">
            <button 
              onClick={() => { playAudioSFX('click'); setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}
              className="text-xs text-slate-400 hover:text-purple-300 font-bold underline transition-colors"
            >
              {authMode === 'login' ? 'Need to register a fresh user index?' : 'Already have a running local file? Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (inBattleMode) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100 antialiased">
        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs select-none">
          <span className="font-black tracking-wider text-purple-400 uppercase">
            {battleType === 'tower' && activeBoss ? `Tower Arena: Floor ${user.towerFloor}` : 'Standard Rank Arena Match'}
          </span>
          <div className="space-x-2">
            <button onClick={() => executeEndMatch(true)} className="bg-emerald-600 px-3 py-1 rounded font-bold text-[11px]">Mock Win</button>
            <button onClick={() => executeEndMatch(false)} className="bg-red-600 px-3 py-1 rounded font-bold text-[11px]">Mock Defeat</button>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between max-w-xl mx-auto w-full p-4 relative pb-24">
          {battleType === 'tower' && activeBoss ? (
            <div className="bg-gradient-to-r from-purple-950 to-slate-950 border border-purple-500/20 p-3 rounded-xl text-center shadow-lg">
              <span className="text-[10px] uppercase font-black tracking-widest text-purple-400">{activeBoss.type}</span>
              <h4 className="text-sm font-black text-slate-100 mt-1">{activeBoss.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Boss Scaling Modifier: +{activeBoss.scaledPower} Base Power</p>
            </div>
          ) : (
            <PlayerPanel playerId={localPlayerId} isOpponent />
          )}
          <div className="my-4 flex flex-col items-center justify-center flex-1 border border-dashed border-slate-800 rounded-2xl p-4">
            <PhaseBar />
          </div>
          <div className="space-y-3">
            <BattleHand playerId={localPlayerId} />
            <BattleControls />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center w-full min-h-screen bg-slate-950 font-sans text-white antialiased">
      <div className={`flex flex-col relative w-full max-w-[430px] h-[920px] bg-slate-900 border-x border-slate-800 shadow-2xl overflow-hidden rounded-[40px] ${matchmakingState === 'countdown' ? 'animate-pulse' : ''}`}>
        
        <header className="flex justify-between items-center px-6 pt-12 pb-4 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800/60 z-30 select-none">
          <div className="flex items-center space-x-2.5">
            <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold hover:bg-red-950 hover:border-red-800 transition-colors">🔲</button>
            <div className="flex flex-col" onClick={() => { playAudioSFX('click'); setShowStatsModal(true); }}>
              <span className="text-xs font-black tracking-wide text-slate-100 hover:text-purple-400 cursor-pointer transition-colors">
                {user.username.toUpperCase()} 📊
              </span>
              <span className="text-[10px] font-bold text-purple-400 -mt-0.5">BP: {user.battlePoints} 🏆</span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] font-black">
            <div className="flex items-center bg-slate-950 pl-2 pr-3 py-1 rounded-full border border-teal-500/20">
              <span className="text-teal-400 mr-1">🌀</span>{user.credits}
            </div>
            <div className="flex items-center bg-slate-950 pl-2 pr-3 py-1 rounded-full border border-amber-500/20">
              <span className="text-amber-400 mr-1">🪙</span>{user.gold}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto px-4 pt-4 pb-24 scrollbar-none z-10">
          {currentTab === 'shop' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="space-y-2">
                <h4 className="text-xs font-black tracking-widest text-purple-400 uppercase">Base Tamer Unlock Station</h4>
                <div className="grid grid-cols-2 gap-3">
                  {cardList.filter(card => card.type?.toLowerCase() === 'tamer').map((card) => {
                    const isOwned = user.unlockedCardIds.includes(card.id);
                    return (
                      <div key={card.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between shadow-md">
                        <div className="flex justify-between text-[10px] font-black">
                          <span className="w-4 h-4 bg-blue-600 rounded-full text-center">{card.cost}</span>
                          <span className="w-4 h-4 bg-orange-600 rounded-full text-center">{card.power}</span>
                        </div>
                        <div className="text-center py-4">
                          <span className="text-xs font-black block text-slate-200">{card.name}</span>
                        </div>
                        <button 
                          disabled={isOwned}
                          onClick={() => processPurchase(card.id, 'base', 150, 'bp')}
                          className={`w-full font-black text-[10px] py-2 rounded-xl uppercase tracking-wider ${isOwned ? 'bg-slate-800 text-slate-500' : 'bg-purple-600 text-purple-100'}`}
                        >
                          {isOwned ? 'Acquired' : '150 🏆'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'collection' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-black text-purple-400">ACTIVE DECK COMPOSITION</span>
                <span className="font-black bg-purple-950 px-2 py-0.5 rounded border border-purple-800 text-purple-200">{user.activeDeckCardIds.length} / 12 Slot</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {cardList.map((card) => {
                  const isUnlocked = user.unlockedCardIds.includes(card.id);
                  const isDeckResident = user.activeDeckCardIds.includes(card.id);
                  return (
                    <div 
                      key={card.id} 
                      onClick={() => { playAudioSFX('click'); setSelectedCardId(card.id); }}
                      className={`relative aspect-[2.5/3.5] bg-gradient-to-b from-slate-900 to-slate-950 border rounded-xl p-1.5 flex flex-col justify-between shadow transition-all ${isDeckResident ? 'border-purple-500' : 'border-slate-800'}`}
                    >
                      <div className="flex justify-between text-[9px] font-black z-10">
                        <span className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">{card.cost}</span>
                        <span className="w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center">{card.power}</span>
                      </div>
                      <div className="text-center flex flex-col items-center justify-center flex-1 my-2">
                        <span className="text-[10px] font-black text-slate-200 truncate w-full">{card.name}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">{isUnlocked ? 'Unlocked' : 'Free Trial'}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleDeckSlot(card.id); }}
                        className={`w-full text-[8px] font-black py-0.5 rounded border ${isDeckResident ? 'bg-purple-900 text-purple-200' : 'bg-slate-950 text-slate-400'}`}
                      >
                        {isDeckResident ? '✓ In Deck' : '+ Slot'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentTab === 'match' && (
            <div className="flex flex-col justify-between h-full min-h-[660px] py-2 animate-fadeIn select-none">
              {matchmakingState === 'idle' ? (
                <>
                  <div className="flex justify-center items-center mt-8">
                    <div className="w-44 aspect-[2.5/3.5] bg-gradient-to-tr from-purple-950 via-slate-900 to-slate-950 border-2 border-purple-500 rounded-2xl p-4 flex flex-col justify-between shadow-2xl">
                      <span className="text-[9px] font-black tracking-widest text-purple-400 border border-purple-800 px-2 py-0.5 rounded-full w-fit">PRIMARY ARSENAL</span>
                      <div className="text-center my-auto flex flex-col">
                        <span className="text-sm font-black text-slate-100">Main Deck Profile</span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1">{user.activeDeckCardIds.length} / 12 Cards Synced</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full mt-auto mb-10 flex flex-col items-center space-y-4">
                    <button 
                      onClick={() => triggerMatchmaking('standard')}
                      className="w-64 h-16 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl font-black text-lg text-slate-950 uppercase tracking-widest shadow-xl"
                    >
                      Assemble Match
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                  <div className="w-20 h-20 rounded-full border-4 border-t-orange-500 border-slate-800 animate-spin" />
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black uppercase tracking-widest">
                      {matchmakingState === 'searching' ? 'Searching Matchmaking Nodes...' : 'Match Confirmed!'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {matchmakingState === 'searching' ? 'Locating tamer opponent rows...' : `Arena Initialization in ${countdown}s`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTab === 'modes' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 border border-purple-500/30 rounded-3xl p-5 shadow-2xl flex flex-col justify-between min-h-[220px]">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="bg-purple-900 text-purple-200 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full w-fit">TAMER GAUNTLET</span>
                    <h3 className="text-xl font-black tracking-wide text-slate-100 mt-2">The Tower Battle</h3>
                  </div>
                </div>
                <div className="bg-slate-950 px-4 py-2.5 rounded-xl text-center flex justify-around text-xs my-2 font-bold">
                  <div><span className="text-purple-400 block text-[10px] uppercase font-black">Current Floor</span><span className="text-sm font-black">{user.towerFloor}</span></div>
                  <div><span className="text-amber-400 block text-[10px] uppercase font-black">BP Bonus Multiplier</span><span className="text-sm font-black">{(1 + (user.towerFloor * 0.3)).toFixed(1)}x</span></div>
                </div>
                <button 
                  disabled={matchmakingState !== 'idle'}
                  onClick={() => triggerMatchmaking('tower')}
                  className="w-full bg-purple-600 font-black text-xs py-3 rounded-xl uppercase tracking-widest"
                >
                  Ascend Floor {user.towerFloor}
                </button>
              </div>
            </div>
          )}
        </main>

        {selectedCardId && (() => {
          const card = cardList.find(c => c.id === selectedCardId);
          if (!card) return null;
          const ownedSkins = user.unlockedVariants[card.id] || ['base'];
          return (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center">
              <div className="w-full bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 space-y-6 pb-12">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div className="flex flex-col">
                    <h3 className="text-lg font-black text-slate-100">{card.name}</h3>
                  </div>
                  <button onClick={() => { playAudioSFX('click'); setSelectedCardId(null); }} className="w-8 h-8 rounded-full bg-slate-800">✕</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['base', 'foil', 'gold'].map((skin) => (
                    <div key={skin} className="p-2 border border-slate-800 rounded text-center text-xs">
                      {skin.toUpperCase()} {ownedSkins.includes(skin) ? '✓' : '🔒'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {showStatsModal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h3 className="font-black text-purple-400 uppercase text-sm">Player Ledger Spec</h3>
                <button onClick={() => { playAudioSFX('click'); setShowStatsModal(false); }} className="text-slate-500 font-bold">✕</button>
              </div>
              <div className="space-y-2 text-xs font-bold text-slate-300">
                <div className="flex justify-between bg-slate-950 p-2 rounded-lg">
                  <span>Total Sorties:</span><span>{user.totalMatchesPlayed}</span>
                </div>
                <div className="flex justify-between bg-slate-950 p-2 rounded-lg">
                  <span>Victories:</span><span className="text-emerald-400">{user.totalMatchesWon}</span>
                </div>
                <div className="flex justify-between bg-slate-950 p-2 rounded-lg">
                  <span>Max Tower Height:</span><span className="text-indigo-400">Floor {user.highestTowerFloorReached}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-slate-950 border-t border-slate-800/60 flex justify-around items-center px-4 pb-4 z-30">
          <button onClick={() => selectTab('shop')} className={`flex flex-col items-center justify-center w-16 h-14 ${currentTab === 'shop' ? 'text-amber-400' : 'text-slate-500'}`}>🪙 Shop</button>
          <button onClick={() => selectTab('collection')} className={`flex flex-col items-center justify-center w-16 h-14 ${currentTab === 'collection' ? 'text-purple-400' : 'text-slate-500'}`}>🎴 Cards</button>
          <button onClick={() => selectTab('match')} className={`flex flex-col items-center justify-center w-16 h-14 ${currentTab === 'match' ? 'text-orange-400' : 'text-slate-500'}`}>⚔️ Match</button>
          <button onClick={() => selectTab('modes')} className={`flex flex-col items-center justify-center w-16 h-14 ${currentTab === 'modes' ? 'text-indigo-400' : 'text-slate-500'}`}> Castle Modes</button>
        </nav>

      </div>
    </div>
  );
}


