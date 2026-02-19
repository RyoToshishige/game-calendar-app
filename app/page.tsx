'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [newGameName, setNewGameName] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [daysLater, setDaysLater] = useState('0');
  const [hoursLater, setHoursLater] = useState('0');
  const [fixedEndDate, setFixedEndDate] = useState(''); // 日付(YYYY-MM-DD)のみ
  const [isRemindNeeded, setIsRemindNeeded] = useState(true);
  const [showAddModal, setShowAddModal] = useState<'game' | 'event' | null>(null);

  const fetchData = async () => {
    const { data: gData } = await supabase.from('games').select('*').order('created_at', { ascending: true });
    if (gData) setGames(gData);

    const { data: eData } = await supabase.from('events').select('*').order('end_at', { ascending: true });
    if (eData) {
      const sorted = [...eData].sort((a, b) => {
        if (a.is_remind_needed === b.is_remind_needed) return new Date(a.end_at).getTime() - new Date(b.end_at).getTime();
        return a.is_remind_needed ? 1 : -1;
      });
      setEvents(sorted);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const addGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('games').insert([{ name: newGameName }]);
    if (!error) { setNewGameName(''); setShowAddModal(null); fetchData(); }
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalEndDate;
    if (fixedEndDate) {
      // 日付指定の場合は、その日の 23:59:00 を終了時刻とする
      const d = new Date(fixedEndDate);
      d.setHours(23, 59, 0, 0);
      finalEndDate = d.toISOString();
    } else {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setDate(d.getDate() + parseInt(daysLater));
      d.setHours(d.getHours() + parseInt(hoursLater));
      finalEndDate = d.toISOString();
    }

    const { error } = await supabase.from('events').insert([
      { game_name: selectedGame, title: eventTitle, end_at: finalEndDate, is_remind_needed: isRemindNeeded }
    ]);

    if (!error) {
      setEventTitle(''); setFixedEndDate(''); setDaysLater('0'); setHoursLater('0');
      setShowAddModal(null); fetchData();
    }
  };

  const timelineDays = (() => {
    const days = [];
    for (let i = -1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  })();
  const timelineStart = timelineDays[0].getTime();
  const timelineEnd = timelineDays[8].getTime() + 24 * 60 * 60 * 1000;

  const getTimelinePos = (dateStr: string) => {
    const time = new Date(dateStr).getTime();
    const progress = ((time - timelineStart) / (timelineEnd - timelineStart)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getRemainingTime = (endStr: string) => {
    const diff = new Date(endStr).getTime() - Date.now();
    if (diff < 0) return "終了";
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `あと ${d}日 ${h}時間`;
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden text-slate-900 font-sans">
      
      <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="fixed top-4 left-4 z-[60] bg-indigo-600 text-white p-2 rounded-lg shadow-lg">
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      {/* サイドバー */}
      <aside className={`bg-white border-r h-full flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="p-6 pt-16 font-black text-xl border-b text-indigo-600 whitespace-nowrap">
          EVENT MANAGER
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 min-w-[256px]">
          <button onClick={() => setSelectedGame(null)} className={`w-full text-left p-3 rounded-xl flex items-center gap-2 ${!selectedGame ? 'bg-indigo-50 text-indigo-700 font-bold' : 'hover:bg-slate-50 text-slate-500'}`}>
            🏠 全体スケジュール
          </button>
          <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Games</div>
          {games.map(g => (
            <button key={g.id} onClick={() => setSelectedGame(g.name)} className={`w-full text-left p-3 rounded-xl truncate transition-all ${selectedGame === g.name ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-50'}`}>
              {g.name}
            </button>
          ))}
          <button onClick={() => setShowAddModal('game')} className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-400 font-bold">
            ＋ ゲームを追加
          </button>
        </nav>
      </aside>

      {/* メイン */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-10 pt-20 transition-all">
        <h1 className="text-3xl font-black mb-10 truncate">{selectedGame || '全体スケジュール'}</h1>

        {/* タイムライン */}
        <section className="bg-white p-6 rounded-[32px] shadow-sm mb-10 overflow-hidden border border-slate-200">
          <div className="flex justify-between border-b pb-4 mb-4">
            {timelineDays.map((d, i) => (
              <div key={i} className={`text-center flex-1 ${i === 1 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
                <p className="text-[10px] uppercase font-black">{d.toLocaleDateString('ja-JP', {weekday: 'short'})}</p>
                <p className="text-sm font-black">{d.getDate()}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 relative">
            <div className="absolute top-0 bottom-0 w-px bg-indigo-600 z-10 shadow-[0_0_8px_indigo]" style={{ left: '16.6%' }}></div>
            {(selectedGame ? events.filter(e => e.game_name === selectedGame) : games).map((item, idx) => {
              const relevantEvent = selectedGame ? item : events.find(e => e.game_name === item.name && !e.is_completed);
              if (!relevantEvent) return null;
              const startPos = getTimelinePos(relevantEvent.start_at);
              const endPos = getTimelinePos(relevantEvent.end_at);
              const width = Math.max(endPos - startPos, 2);
              return (
                <div key={idx} className="h-6 w-full relative">
                  <div className={`absolute h-full rounded-full transition-all flex items-center px-3 text-[9px] font-bold text-white overflow-hidden ${relevantEvent.is_completed ? 'bg-slate-300' : 'bg-indigo-500 shadow-sm'}`} style={{ left: `${startPos}%`, width: `${width}%` }}>
                    <span className="truncate">{selectedGame ? relevantEvent.title : item.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* リスト表示：レイアウト修正版 */}
        <div className="grid gap-4">
          {(selectedGame ? events.filter(e => e.game_name === selectedGame) : events).map(e => (
            <div key={e.id} className={`p-5 bg-white rounded-3xl flex items-center justify-between shadow-sm border border-slate-100 ${e.is_completed ? 'opacity-30' : ''}`}>
              <div className="flex-1 min-w-0 pr-4"> {/* min-w-0 が長い文字の崩れを防ぐ */}
                <div className="flex items-center gap-2 mb-1">
                  {!e.is_remind_needed && <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded uppercase flex-shrink-0">Schedule</span>}
                  <h3 className="font-black text-lg truncate">{!selectedGame && `[${e.game_name}] `}{e.title}</h3>
                </div>
                <p className="text-xs font-bold text-red-500 whitespace-nowrap">{getRemainingTime(e.end_at)}</p>
              </div>
              <button 
                onClick={() => { supabase.from('events').update({ is_completed: !e.is_completed }).eq('id', e.id).then(() => fetchData()); }} 
                className={`flex-shrink-0 px-6 py-2 rounded-2xl text-xs font-black transition-all ${e.is_completed ? 'bg-slate-200' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'}`}
              >
                {e.is_completed ? '完了' : '報告'}
              </button>
            </div>
          ))}
        </div>

        {selectedGame && (
          <button onClick={() => setShowAddModal('event')} className="fixed bottom-10 right-10 bg-indigo-600 text-white w-16 h-16 rounded-[24px] shadow-2xl flex items-center justify-center text-3xl font-black z-40">＋</button>
        )}
      </main>

      {/* モーダル：日時指定を日付のみに変更 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl">
            {showAddModal === 'game' ? (
              <form onSubmit={addGame}>
                <h2 className="text-2xl font-black mb-8 italic text-indigo-600">Add Game</h2>
                <input type="text" className="w-full bg-slate-50 p-4 rounded-2xl mb-8 outline-none border-2 border-transparent focus:border-indigo-100 font-bold" placeholder="ゲーム名" value={newGameName} onChange={e => setNewGameName(e.target.value)} autoFocus required />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowAddModal(null)} className="flex-1 font-bold text-slate-400">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black">Register</button>
                </div>
              </form>
            ) : (
              <form onSubmit={addEvent} className="space-y-6">
                <h2 className="text-2xl font-black mb-2 italic text-indigo-600">New Event</h2>
                <input type="text" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold border-2 border-transparent focus:border-indigo-100" placeholder="イベント名" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 rounded-[24px]">
                    <p className="text-[10px] font-black text-slate-400 mb-3 uppercase">期間で指定</p>
                    <div className="flex items-center gap-1 font-black text-lg">
                      <input type="number" className="w-10 bg-transparent outline-none text-indigo-600" value={daysLater} onChange={e => {setDaysLater(e.target.value); setFixedEndDate('');}} />
                      <span>日</span>
                      <input type="number" className="w-10 bg-transparent outline-none text-indigo-600" value={hoursLater} onChange={e => {setHoursLater(e.target.value); setFixedEndDate('');}} />
                      <span>h</span>
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50 rounded-[24px]">
                    <p className="text-[10px] font-black text-slate-400 mb-3 uppercase">日付で指定</p>
                    <input type="date" className="bg-transparent text-sm font-bold outline-none w-full text-indigo-600" value={fixedEndDate} onChange={e => setFixedEndDate(e.target.value)} />
                  </div>
                </div>

                <label className="flex items-center gap-4 p-5 bg-slate-50 rounded-[24px] cursor-pointer">
                  <input type="checkbox" checked={!isRemindNeeded} onChange={() => setIsRemindNeeded(!isRemindNeeded)} className="w-6 h-6 rounded-lg accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-600 italic">リマインド不要</span>
                </label>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowAddModal(null)} className="flex-1 font-bold text-slate-400 text-sm">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">Save</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}