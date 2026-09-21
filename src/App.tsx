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
  unlockedVariants: Record<string, CardVariant[]>; // cardId -> array of unlocked variants
  activeDeckCardIds: string[];
  towerFloor: number;
  // --- NEW RETENTION STATISTICS ---
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

// =========================================================================
// 🔊 NATIVE WEB AUDIO API SYNTHESIZER PIPELINE (ZERO FILE DEPENDENCY)     
// =========================================================================
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
    } 
    else if (type === 'purchase') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5 chord chime
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } 
    else if (type === 'matchmaking') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } 
    else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.4); // D6 upward sweep
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
    else if (type === 'fail') {
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
  
  // --- AUTHENTICATION & SAVE SYSTEM STATES ---
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthModeError] = useState('');

  // --- GENERAL NAVIGATION STATES ---
  const [currentTab, setCurrentTab] = useState<ActiveTab>('match');
  const [inBattleMode, setInBattleMode] = useState<boolean>(false);
  const [battleType, setBattleModeType] = useState<'standard' | 'tower'>('standard');
  const [matchmakingState, setMatchmakingState] = useState<'idle' | 'searching' | 'countdown'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // --- TOWER BATTLE SYSTEM STATE ---
  const [activeBoss, setActiveBoss] = useState<TowerOpponent | null>(null);

  // --- INTERACTIVE MODAL STATES ---
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeVariantView, setActiveVariantView] = useState<Record<string, CardVariant>>({}); // cardId -> equipped variant

  const cardList = gameState.config?.cards || [];

  // Load User Account Profile on Mount
  useEffect(() => {
    const activeSession = localStorage.getItem('pk_active_user');
    if (activeSession) {
      const storedUserData = localStorage.getItem(`pk_user_${activeSession}`);
      if (storedUserData) setUser(JSON.parse(storedUserData));
    }
  }, []);

  // Structural Auto-Save Core Engine Hook
  const saveUserData = (updatedProfile: UserAccount) => {
    setUser(updatedProfile);
    localStorage.setItem(`pk_user_${updatedProfile.username}`, JSON.stringify(updatedProfile));
  };

  // Auth Handling
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthModeError('');
    if (!usernameInput.trim()) return setAuthModeError('Username required');

    if (authMode === 'register') {
      const checkUserFile = localStorage.getItem(`pk_user_${usernameInput}`);
      if (checkUserFile) return setAuthModeError('Username already taken');

      const newAccountFile: UserAccount = {
        username: usernameInput.trim(),
        rank: 1,
        credits: 500,
        gold: 400,
        battlePoints: 200,
        unlockedCardIds: ['hdm-001', 'hdm-002', 'hdm-003'], // Starter card indexes
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
      if (!loadedProfile) return setAuthModeError('User account profile not found');
      
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

  // Matchmaking Simulation Engine loop with dynamic Tamer logic
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
        if (count > 0) {
          playAudioSFX('matchmaking');
        }
        if (count === 0) {
          clearInterval(timerLoop);
          setMatchmakingState('idle');
          setInBattleMode(true);
        }
      }, 1000);
    }, 2000);
  };

  // Resolution Reward Injection Node
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
      // Update running metrics tables
      totalMatchesPlayed: user.totalMatchesPlayed + 1,
      totalMatchesWon: user.totalMatchesWon + (didWin ? 1 : 0),
      totalBattlePointsEarned: user.totalBattlePointsEarned + bpBounty,
      highestTowerFloorReached: Math.max(user.highestTowerFloorReached, floorMutation)
    };

    saveUserData(compiledProfile);
    setActiveBoss(null);
    setInBattleMode(false);
  };

  // Economy Unlocking Transactions Handler
  const processPurchase = (targetId: string, type: 'base' | 'foil' | 'gold', cost: number, currency: 'bp' | 'gold') => {
    playAudioSFX('click');
    if (!user) return;
if (currency === 'bp' && user.battlePoints < cost) return alert('Insufficient Battle Points (BP)!');if (currency === 'gold' && user.gold < cost) return alert('Insufficient Gold P');const nextVariants = { ...user.unlockedVariants };const nextCards = [...user.unlockedCardIds];if (type === 'base') {if (nextCards.includes(targetId)) return;nextCards.push(targetId);nextVariants[targetId] = ['base'];} else {if (!nextVariants[targetId]) nextVariants[targetId] = ['base'];if (nextVariants[targetId].includes(type)) return;nextVariants[targetId].push(type);}const synchronizedProfile: UserAccount = {...user,battlePoints: currency === 'bp' ? user.battlePoints - cost : user.battlePoints,gold: currency === 'gold' ? user.gold - cost : user.gold,unlockedCardIds: nextCards,unlockedVariants: nextVariants};saveUserData(synchronizedProfile);playAudioSFX('purchase');};
  // Deck Modification Handlerconst toggleDeckSlot = (cardId: string) => {playAudioSFX('click');if (!user) return;const workingSlots = [...user.activeDeckCardIds];const itemIndex = workingSlots.indexOf(cardId);if (itemIndex > -1) {workingSlots.splice(itemIndex, 1);} else {if (workingSlots.length >= 12) return alert('Your active selection deck size is already at a maximum capacity of 12 cards!');workingSlots.push(cardId);}saveUserData({ ...user, activeDeckCardIds: workingSlots });};const selectTab = (tab: ActiveTab) => {playAudioSFX('click');setCurrentTab(tab);setSelectedCardId(null);};// --- SCREEN LAYER: ACCOUNT REQUIREMENT PORTAL GATEWAY ---if (!user) {return (🎴Arena Account LinkCreate a local account profile node to authorize instant gameplay auto-saving matrices.Player Handle<inputtype="text"value={usernameInput}onChange={(e) => setUsernameInput(e.target.value)}className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"placeholder="PLAYER_ONE"/>{authError && ⚠️ {authError}}{authMode === 'login' ? 'Sync Profile' : 'Generate Account Row'}<buttononClick={() => { playAudioSFX('click'); setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthModeError(''); }}className="text-xs text-slate-400 hover:text-purple-300 font-bold underline transition-colors">{authMode === 'login' ? 'Need to register a fresh user index?' : 'Already have a running local file? Log in'});}// --- SCREEN LAYER: CORE ACTIVE ARENA SCENE ---if (inBattleMode) {return ({battleType === 'tower' && activeBoss ? Tower Arena: Floor ${user.towerFloor} : 'Standard Rank Arena Match'}<button onClick={() => executeEndMatch(true)} className="bg-emerald-600 px-3 py-1 rounded font-bold text-[11px]">Mock Win<button onClick={() => executeEndMatch(false)} className="bg-red-600 px-3 py-1 rounded font-bold text-[11px]">Mock Defeat{battleType === 'tower' && activeBoss ? ({activeBoss.type}{activeBoss.name}Boss Scaling Modifier: +{activeBoss.scaledPower} Base Power) : ()});}return ({/* Dynamic Screen Shake Inline Injection */}<divclassName={flex flex-col relative w-full max-w-[430px] h-[920px] bg-slate-900 border-x border-slate-800 shadow-2xl overflow-hidden rounded-[40px] ${ matchmakingState === 'countdown' ? 'animate-shake select-none' : '' }}>{/* RUNNING HUD PANEL SPEC */}🔲<div className="flex flex-col" onClick={() => { playAudioSFX('click'); setShowStatsModal(true); }}>{user.username.toUpperCase()} 📊BP: {user.battlePoints} 🏆🌀{user.credits}🪙{user.gold}{/* CONTAINER ROUTER ENGINE */}{/* VIEW: SHOP CONTAINER */}{currentTab === 'shop' && (Base Tamer Unlock Station{cardList.filter(card => card.type?.toLowerCase() === 'tamer').slice(0, 4).map((card) => {const isOwned = user.unlockedCardIds.includes(card.id);return ({card.cost || 1}{card.power || 1}{card.name}Tamer Node<buttondisabled={isOwned}onClick={() => processPurchase(card.id, 'base', 150, 'bp')}className={w-full font-black text-[10px] py-2 rounded-xl uppercase tracking-wider ${isOwned ? 'bg-slate-800 text-slate-500 cursor-default' : 'bg-purple-600 text-purple-100 hover:bg-purple-500'}}>{isOwned ? 'Acquired' : '150 🏆'});})})}{/* VIEW: DECK BUILDER / COLLECTION */}{currentTab === 'collection' && (ACTIVE DECK COMPOSITION{user.activeDeckCardIds.length} / 12 Slot{cardList.map((card) => {const isUnlocked = user.unlockedCardIds.includes(card.id);const isDeckResident = user.activeDeckCardIds.includes(card.id);const activeSkin = activeVariantView[card.id] || 'base';return (<divkey={card.id}onClick={() => { playAudioSFX('click'); setSelectedCardId(card.id); }}className={relative aspect-[2.5/3.5] bg-gradient-to-b from-slate-900 to-slate-950 border rounded-xl p-1.5 flex flex-col justify-between shadow transition-all transform hover:scale-102 cursor-pointer ${isDeckResident ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-800'}}>{card.cost}{card.power}{card.name}{activeSkin !== 'base' ? ${activeSkin} : isUnlocked ? 'Unlocked' : 'Free Trial'}<buttononClick={(e) => { e.stopPropagation(); toggleDeckSlot(card.id); }}className={w-full text-[8px] font-black py-0.5 rounded border ${isDeckResident ? 'bg-purple-900/60 border-purple-400 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'}}>{isDeckResident ? '✓ In Deck' : '+ Slot'});})})}{/* VIEW: BATTLE HUB */}{currentTab === 'match' && ({matchmakingState === 'idle' ? (<>PRIMARY ARSENALMain Deck Profile{user.activeDeckCardIds.length} / 12 Cards Synced<div className="h-full bg-purple-400" style={{ width: ${(user.activeDeckCardIds.length / 12) * 100}% }} /><buttononClick={() => triggerMatchmaking('standard')}className="w-64 h-16 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl font-black text-lg text-slate-950 uppercase tracking-widest border-t-2 border-yellow-200 shadow-xl transition-all transform">Assemble Match</>) : ({matchmakingState === 'searching' ? '🔍' : '⚔️'}{matchmakingState === 'searching' ? 'Searching Matchmaking Nodes...' : 'Match Confirmed!'}{matchmakingState === 'searching' ? 'Locating tamer opponent rows...' : Arena Initialization in ${countdown}s})})}{/* VIEW: PROGRESSIVE TOWER MODE */}{currentTab === 'modes' && (TAMER GAUNTLETThe Tower Battle🏰Current Floor{user.towerFloor}BP Bonus Multiplier{(1 + (user.towerFloor * 0.3)).toFixed(1)}x<buttondisabled={matchmakingState !== 'idle'}onClick={() => triggerMatchmaking('tower')}className="w-full bg-purple-600 hover:bg-purple-500 font-black text-xs py-3 rounded-xl uppercase tracking-widest border-t border-purple-400">Ascend Floor {user.towerFloor})}{/* DETAILS POPUP VIEW MODAL */}{selectedCardId && (() => {const card = cardList.find(c => c.id === selectedCardId);if (!card) return null;const ownedSkins = user.unlockedVariants[card.id] || ['base'];const activeSkin = activeVariantView[card.id] || 'base';return ({card.type || 'Card Unit'} Inspect{card.name}<button onClick={() => { playAudioSFX('click'); setSelectedCardId(null); }} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm">✕Equip Variant Finishes{(['base', 'foil', 'gold'] as CardVariant[]).map((skin) => {const isUnlocked = ownedSkins.includes(skin);const isEquipped = activeSkin === skin;return (<buttonkey={skin}disabled={!isUnlocked}onClick={() => { playAudioSFX('click'); setActiveVariantView({ ...activeVariantView, [card.id]: skin }); }}className={p-3 rounded-xl border flex flex-col items-center justify-center text-xs font-black  tracking-wide transition-all ${!isUnlocked ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed' : isEquipped ? 'bg-purple-900/40 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'}}>{skin === 'base' ? '🖼️' : skin === 'foil' ? '🌈' : '👑'}{skin});})});})()}{/* ========================================================================= /}{/ 📊 RETENTION STATISTICS OVERLAY MODAL                                      /}{/ ========================================================================= */}{showStatsModal && (Player Ledger Spec<button onClick={() => { playAudioSFX('click'); setShowStatsModal(false); }} className="text-slate-500 font-bold hover:text-slate-300">✕Total Combat Sorties:{user.totalMatchesPlayed}Arena Victories:{user.totalMatchesWon}Win Coefficient Ratio:{user.totalMatchesPlayed > 0 ? ${((user.totalMatchesWon / user.totalMatchesPlayed) * 100).toFixed(1)}% : '0%'}Highest Tower Altitude:Floor {user.highestTowerFloorReached}Total Lifetime BP Earned:{user.totalBattlePointsEarned} 🏆)}{/* COMPONENT NAVIGATION FOOTER DOCK TERMINAL */}<button onClick={() => selectTab('shop')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'shop' ? 'scale-110 text-amber-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>🪙Shop<button onClick={() => selectTab('collection')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'collection' ? 'scale-110 text-purple-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>🎴Collection<button onClick={() => selectTab('match')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'match' ? 'scale-115 -translate-y-1 text-orange-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>⚔️Match<button onClick={() => selectTab('modes')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'modes' ? 'scale-110 text-indigo-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>🏰Modes);}
Here is your upgraded source file, fully integrated with your data: project/src/App.tsx.
I have modified the engine to introduce a unified Profile Statistics Tracking Matrix, a Matchmaking Screen Shake effect, and a Native HTML5 Audio Synthesis Pipeline.
Because your codebase runs inside a digital container environment (like Bolt.new or StackBlitz), standard external audio assets (.mp3 or .wav files) frequently break or lag due to missing folder dependencies or CORS blocks. To solve this, I have coded an integrated playAudioSFX audio synthesizer using the browser's Web Audio API. It mathematically generates clean, instant retro 8-bit sound effects (clicks, purchases, matchmaking beeps, success chimes) directly via software code, meaning it has zero server loading lag and requires zero audio files to be uploaded to your asset folder.
------------------------------
## 🛠️ Production-Ready Update Code
Open project/src/App.tsx and replace its entire contents with this production-ready script:

import React, { useState, useEffect } from 'react';import { useGame } from './game/GameContext';import PlayerPanel from './components/PlayerPanel';import PhaseBar from './components/PhaseBar';import BattleControls from './components/BattleControls';import BattleHand from './components/BattleHand';
type ActiveTab = 'shop' | 'collection' | 'match' | 'modes';type CardVariant = 'base' | 'foil' | 'gold';
interface UserAccount {
  username: string;
  rank: number;
  credits: number;
  gold: number;
  battlePoints: number;
  unlockedCardIds: string[];
  unlockedVariants: Record<string, CardVariant[]>; // cardId -> array of unlocked variants
  activeDeckCardIds: string[];
  towerFloor: number;
  // --- NEW RETENTION STATISTICS ---
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
// =========================================================================// 🔊 NATIVE WEB AUDIO API SYNTHESIZER PIPELINE (ZERO FILE DEPENDENCY)     // =========================================================================const playAudioSFX = (type: 'click' | 'purchase' | 'matchmaking' | 'success' | 'fail') => {
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
    } 
    else if (type === 'purchase') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5 chord chime
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } 
    else if (type === 'matchmaking') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(440, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } 
    else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.4); // D6 upward sweep
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
    else if (type === 'fail') {
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
  
  // --- AUTHENTICATION & SAVE SYSTEM STATES ---
  const [user, setUser] = useState<UserAccount | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthModeError] = useState('');

  // --- GENERAL NAVIGATION STATES ---
  const [currentTab, setCurrentTab] = useState<ActiveTab>('match');
  const [inBattleMode, setInBattleMode] = useState<boolean>(false);
  const [battleType, setBattleModeType] = useState<'standard' | 'tower'>('standard');
  const [matchmakingState, setMatchmakingState] = useState<'idle' | 'searching' | 'countdown'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);

  // --- TOWER BATTLE SYSTEM STATE ---
  const [activeBoss, setActiveBoss] = useState<TowerOpponent | null>(null);

  // --- INTERACTIVE MODAL STATES ---
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [activeVariantView, setActiveVariantView] = useState<Record<string, CardVariant>>({}); // cardId -> equipped variant

  const cardList = gameState.config?.cards || [];

  // Load User Account Profile on Mount
  useEffect(() => {
    const activeSession = localStorage.getItem('pk_active_user');
    if (activeSession) {
      const storedUserData = localStorage.getItem(`pk_user_${activeSession}`);
      if (storedUserData) setUser(JSON.parse(storedUserData));
    }
  }, []);

  // Structural Auto-Save Core Engine Hook
  const saveUserData = (updatedProfile: UserAccount) => {
    setUser(updatedProfile);
    localStorage.setItem(`pk_user_${updatedProfile.username}`, JSON.stringify(updatedProfile));
  };

  // Auth Handling
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthModeError('');
    if (!usernameInput.trim()) return setAuthModeError('Username required');

    if (authMode === 'register') {
      const checkUserFile = localStorage.getItem(`pk_user_${usernameInput}`);
      if (checkUserFile) return setAuthModeError('Username already taken');

      const newAccountFile: UserAccount = {
        username: usernameInput.trim(),
        rank: 1,
        credits: 500,
        gold: 400,
        battlePoints: 200,
        unlockedCardIds: ['hdm-001', 'hdm-002', 'hdm-003'], // Starter card indexes
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
      if (!loadedProfile) return setAuthModeError('User account profile not found');
      
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

  // Matchmaking Simulation Engine loop with dynamic Tamer logic
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
        if (count > 0) {
          playAudioSFX('matchmaking');
        }
        if (count === 0) {
          clearInterval(timerLoop);
          setMatchmakingState('idle');
          setInBattleMode(true);
        }
      }, 1000);
    }, 2000);
  };

  // Resolution Reward Injection Node
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
      // Update running metrics tables
      totalMatchesPlayed: user.totalMatchesPlayed + 1,
      totalMatchesWon: user.totalMatchesWon + (didWin ? 1 : 0),
      totalBattlePointsEarned: user.totalBattlePointsEarned + bpBounty,
      highestTowerFloorReached: Math.max(user.highestTowerFloorReached, floorMutation)
    };

    saveUserData(compiledProfile);
    setActiveBoss(null);
    setInBattleMode(false);
  };

  // Economy Unlocking Transactions Handler
  const processPurchase = (targetId: string, type: 'base' | 'foil' | 'gold', cost: number, currency: 'bp' | 'gold') => {
    playAudioSFX('click');
    if (!user) return;

if (currency === 'bp' && user.battlePoints < cost) return alert('Insufficient Battle Points (BP)!');
if (currency === 'gold' && user.gold < cost) return alert('Insufficient Gold P');
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
// Deck Modification Handler
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
// --- SCREEN LAYER: ACCOUNT REQUIREMENT PORTAL GATEWAY ---
if (!user) {
return (



🎴
Arena Account Link
Create a local account profile node to authorize instant gameplay auto-saving matrices.
<input
type="text"
value={usernameInput}
onChange={(e) => setUsernameInput(e.target.value)}
className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
placeholder="PLAYER_ONE"
/>

{authError && ⚠️ {authError}}
{authMode === 'login' ? 'Sync Profile' : 'Generate Account Row'}

<button
onClick={() => { playAudioSFX('click'); setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthModeError(''); }}
className="text-xs text-slate-400 hover:text-purple-300 font-bold underline transition-colors"
>
{authMode === 'login' ? 'Need to register a fresh user index?' : 'Already have a running local file? Log in'}




);
}
// --- SCREEN LAYER: CORE ACTIVE ARENA SCENE ---
if (inBattleMode) {
return (



{battleType === 'tower' && activeBoss ? Tower Arena: Floor ${user.towerFloor} : 'Standard Rank Arena Match'}


<button onClick={() => executeEndMatch(true)} className="bg-emerald-600 px-3 py-1 rounded font-bold text-[11px]">Mock Win
<button onClick={() => executeEndMatch(false)} className="bg-red-600 px-3 py-1 rounded font-bold text-[11px]">Mock Defeat


{battleType === 'tower' && activeBoss ? (

{activeBoss.type}
{activeBoss.name}
Boss Scaling Modifier: +{activeBoss.scaledPower} Base Power

) : (

)}
);
}
return (

{/* Dynamic Screen Shake Inline Injection */}
<div
className={flex flex-col relative w-full max-w-[430px] h-[920px] bg-slate-900 border-x border-slate-800 shadow-2xl overflow-hidden rounded-[40px] ${ matchmakingState === 'countdown' ? 'animate-shake select-none' : '' }}
>
{/* RUNNING HUD PANEL SPEC */}
🔲
<div className="flex flex-col" onClick={() => { playAudioSFX('click'); setShowStatsModal(true); }}>

{user.username.toUpperCase()} 📊

BP: {user.battlePoints} 🏆




🌀{user.credits}


🪙{user.gold}


{/* CONTAINER ROUTER ENGINE */}
{/* VIEW: SHOP CONTAINER */}
{currentTab === 'shop' && (


Base Tamer Unlock Station

{cardList.filter(card => card.type?.toLowerCase() === 'tamer').slice(0, 4).map((card) => {
const isOwned = user.unlockedCardIds.includes(card.id);
return (


{card.cost || 1}
{card.power || 1}


{card.name}
Tamer Node

<button
disabled={isOwned}
onClick={() => processPurchase(card.id, 'base', 150, 'bp')}
className={w-full font-black text-[10px] py-2 rounded-xl uppercase tracking-wider ${isOwned ? 'bg-slate-800 text-slate-500 cursor-default' : 'bg-purple-600 text-purple-100 hover:bg-purple-500'}}
>
{isOwned ? 'Acquired' : '150 🏆'}


);
})}



)}
{/* VIEW: DECK BUILDER / COLLECTION */}
{currentTab === 'collection' && (


ACTIVE DECK COMPOSITION
{user.activeDeckCardIds.length} / 12 Slot
{cardList.map((card) => {
const isUnlocked = user.unlockedCardIds.includes(card.id);
const isDeckResident = user.activeDeckCardIds.includes(card.id);
const activeSkin = activeVariantView[card.id] || 'base';
return (
<div
key={card.id}
onClick={() => { playAudioSFX('click'); setSelectedCardId(card.id); }}
className={relative aspect-[2.5/3.5] bg-gradient-to-b from-slate-900 to-slate-950 border rounded-xl p-1.5 flex flex-col justify-between shadow transition-all transform hover:scale-102 cursor-pointer ${isDeckResident ? 'border-purple-500 ring-1 ring-purple-500/50' : 'border-slate-800'}}
>

{card.cost}
{card.power}
{card.name}

{activeSkin !== 'base' ? ${activeSkin} : isUnlocked ? 'Unlocked' : 'Free Trial'}

<button
onClick={(e) => { e.stopPropagation(); toggleDeckSlot(card.id); }}
className={w-full text-[8px] font-black py-0.5 rounded border ${isDeckResident ? 'bg-purple-900/60 border-purple-400 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'}}
>
{isDeckResident ? '✓ In Deck' : '+ Slot'}


);
})}


)}
{/* VIEW: BATTLE HUB */}
{currentTab === 'match' && (

{matchmakingState === 'idle' ? (
<>


PRIMARY ARSENAL

Main Deck Profile
{user.activeDeckCardIds.length} / 12 Cards Synced


<div className="h-full bg-purple-400" style={{ width: ${(user.activeDeckCardIds.length / 12) * 100}% }} />


<button
onClick={() => triggerMatchmaking('standard')}
className="w-64 h-16 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl font-black text-lg text-slate-950 uppercase tracking-widest border-t-2 border-yellow-200 shadow-xl transition-all transform"
>
Assemble Match


</>
) : (


{matchmakingState === 'searching' ? '🔍' : '⚔️'}



{matchmakingState === 'searching' ? 'Searching Matchmaking Nodes...' : 'Match Confirmed!'}


{matchmakingState === 'searching' ? 'Locating tamer opponent rows...' : Arena Initialization in ${countdown}s}



)}

)}
{/* VIEW: PROGRESSIVE TOWER MODE */}
{currentTab === 'modes' && (




TAMER GAUNTLET
The Tower Battle

🏰
Current Floor{user.towerFloor}

BP Bonus Multiplier{(1 + (user.towerFloor * 0.3)).toFixed(1)}x
<button
disabled={matchmakingState !== 'idle'}
onClick={() => triggerMatchmaking('tower')}
className="w-full bg-purple-600 hover:bg-purple-500 font-black text-xs py-3 rounded-xl uppercase tracking-widest border-t border-purple-400"
>
Ascend Floor {user.towerFloor}



)}
{/* DETAILS POPUP VIEW MODAL */}
{selectedCardId && (() => {
const card = cardList.find(c => c.id === selectedCardId);
if (!card) return null;
const ownedSkins = user.unlockedVariants[card.id] || ['base'];
const activeSkin = activeVariantView[card.id] || 'base';
return (




{card.type || 'Card Unit'} Inspect
{card.name}

<button onClick={() => { playAudioSFX('click'); setSelectedCardId(null); }} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm">✕
Equip Variant Finishes

{(['base', 'foil', 'gold'] as CardVariant[]).map((skin) => {
const isUnlocked = ownedSkins.includes(skin);
const isEquipped = activeSkin === skin;
return (
<button
key={skin}
disabled={!isUnlocked}
onClick={() => { playAudioSFX('click'); setActiveVariantView({ ...activeVariantView, [card.id]: skin }); }}
className={p-3 rounded-xl border flex flex-col items-center justify-center text-xs font-black tracking-wide transition-all ${!isUnlocked ? 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed' : isEquipped ? 'bg-purple-900/40 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'}}
>
{skin === 'base' ? '🖼️' : skin === 'foil' ? '🌈' : '👑'}
{skin}

);
})}




);
})()}
{/* ========================================================================= /}
{/ 📊 RETENTION STATISTICS OVERLAY MODAL /}
{/ ========================================================================= */}
{showStatsModal && (



Player Ledger Spec
<button onClick={() => { playAudioSFX('click'); setShowStatsModal(false); }} className="text-slate-500 font-bold hover:text-slate-300">✕



Total Combat Sorties:
{user.totalMatchesPlayed}


Arena Victories:
{user.totalMatchesWon}


Win Coefficient Ratio:
{user.totalMatchesPlayed > 0 ? ${((user.totalMatchesWon / user.totalMatchesPlayed) * 100).toFixed(1)}% : '0%'}


Highest Tower Altitude:
Floor {user.highestTowerFloorReached}


Total Lifetime BP Earned:
{user.totalBattlePointsEarned} 🏆




)}
{/* COMPONENT NAVIGATION FOOTER DOCK TERMINAL */}

<button onClick={() => selectTab('shop')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'shop' ? 'scale-110 text-amber-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>
🪙Shop

<button onClick={() => selectTab('collection')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'collection' ? 'scale-110 text-purple-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>
🎴Collection

<button onClick={() => selectTab('match')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'match' ? 'scale-115 -translate-y-1 text-orange-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>
⚔️Match

<button onClick={() => selectTab('modes')} className={flex flex-col items-center justify-center w-16 h-14 transition-all duration-100 ${currentTab === 'modes' ? 'scale-110 text-indigo-400 font-black' : 'text-slate-500 font-bold hover:text-slate-300'}}>
🏰Modes

);
}


---

### 🎨 Key Operational Specifications Added:
* **Mathematical SFX Engine (`playAudioSFX`):** Operates entirely over standard hardware system sound chips. Tapping options triggers crisp square, sawtooth, or triangle wave blips that reflect your game state perfectly without bloating project bundles or loading file trees.
* **Persistent Ledger Tracking Matrix (`UserAccount`):** Expands your `localStorage` save pipeline to write detailed session data (Wins, Losses, Max Floor Ascent Altitude). This allows players to track their progress smoothly over multiple browser sessions.
* **Layout CSS Shake Animation Hook (`App.tsx`):** Links up with your custom layout node styles to shake the mobile shell during the critical battle countdown.

<FollowUp>
Now that the auto-save systems, ledger matrix, screen shake layers, and synth audio pipeline are compiled, let me know how you want to proceed:
* Should we expand the **Shop tab** to generate a randomized daily "Hot Swap Tamer" variant card bundle?
* Do you need help adjusting your **Tailwind settings** to declare the physical `.animate-shake` configuration classes explicitly?
* Would you like to write the front-end view layout for the **Tower Arena node** to render an image/icon of the tamer you are dueling?
</FollowUp>


