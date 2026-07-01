'use client';

import { useState } from 'react';
import { Clock, Plus, User, CreditCard, Heart, Shield } from 'lucide-react';

export default function Badirty() {
  const [activeTab, setActiveTab] = useState<'feed' | 'sell' | 'profile'>('feed');
  const [vibeBalance] = useState(248);

  const items = [
    {
      id: 1,
      title: "Culotte dentelle rouge portée 3 jours",
      price: 82,
      timeLeft: "47 min",
      bids: 14,
      type: "Culotte",
      verified: true
    },
    {
      id: 2,
      title: "Chaussettes noires sport 5 jours",
      price: 38,
      timeLeft: "3h 12min",
      bids: 9,
      type: "Chaussettes",
      verified: false
    },
    {
      id: 3,
      title: "Ensemble lingerie noire",
      price: 165,
      timeLeft: "1j 4h",
      bids: 22,
      type: "Ensemble",
      verified: true
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
    {/* Header moderne */}
    <header className="fixed top-0 left-0 right-0 bg-zinc-950/80 border-b border-zinc-800 z-50 backdrop-blur-xl">
    <div className="max-w-2xl mx-auto px-6 py-5 flex justify-between items-center">
    <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-xl">💎</div>
    <h1 className="text-3xl font-bold tracking-tight">badirty</h1>
    </div>

    <div className="flex items-center gap-8 text-sm font-medium">
    <button onClick={() => setActiveTab('feed')} className={`hover:text-pink-400 transition ${activeTab === 'feed' ? 'text-pink-500' : 'text-zinc-400'}`}>Découvrir</button>
    <button onClick={() => setActiveTab('sell')} className={`hover:text-pink-400 transition ${activeTab === 'sell' ? 'text-pink-500' : 'text-zinc-400'}`}>Vendre</button>
    <button onClick={() => setActiveTab('profile')} className={`hover:text-pink-400 transition ${activeTab === 'profile' ? 'text-pink-500' : 'text-zinc-400'}`}>Profil</button>
    </div>
    </div>
    </header>

    <main className="pt-24 pb-20 max-w-2xl mx-auto px-4">
    {/* Solde VIBE */}
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 mb-10 flex items-center justify-between">
    <div>
    <p className="text-xs text-zinc-500">SOLDE VIBE</p>
    <p className="text-4xl font-semibold text-pink-400">{vibeBalance} <span className="text-xl text-zinc-500">crédits</span></p>
    </div>
    <button className="bg-white text-black px-8 py-3 rounded-2xl font-medium hover:bg-zinc-200 transition">
    Recharger
    </button>
    </div>

    {activeTab === 'feed' && (
      <div>
      <div className="flex justify-between items-center mb-8">
      <h2 className="text-3xl font-semibold tracking-tight">Enchères en cours</h2>
      <div className="text-xs bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">🔥 Tendances</div>
      </div>

      <div className="space-y-8">
      {items.map((item) => (
        <div key={item.id} className="group bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 hover:border-pink-500/30 transition-all duration-300">
        <div className="h-80 bg-zinc-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute top-6 right-6 bg-black/70 px-5 py-2 rounded-2xl text-sm font-mono flex items-center gap-2">
        <Clock className="w-4 h-4" /> {item.timeLeft}
        </div>
        {item.verified && (
          <div className="absolute top-6 left-6 flex items-center gap-1.5 bg-green-500/10 text-green-400 text-xs px-4 py-1.5 rounded-full">
          <Shield className="w-4 h-4" /> Vérifié
          </div>
        )}
        </div>

        <div className="p-6">
        <div className="flex justify-between">
        <div>
        <p className="font-medium text-lg leading-tight">{item.title}</p>
        <p className="text-pink-400 text-4xl font-semibold mt-3">{item.price}€</p>
        </div>
        <div className="text-right">
        <p className="text-xs text-zinc-500">Enchères</p>
        <p className="text-2xl font-medium">{item.bids}</p>
        </div>
        </div>

        <button className="mt-8 w-full bg-gradient-to-r from-pink-600 to-purple-600 py-5 rounded-2xl font-semibold text-lg hover:brightness-110 transition">
        Enchérir maintenant
        </button>
        </div>
        </div>
      ))}
      </div>
      </div>
    )}

    {activeTab === 'sell' && (
      <div className="py-20 text-center">
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center text-6xl mb-8">👙</div>
      <h2 className="text-4xl font-semibold mb-4">Mettre en vente</h2>
      <p className="text-zinc-400 max-w-md mx-auto">Partage tes articles intimes en toute discrétion et commence à gagner</p>
      <button className="mt-12 bg-white text-black px-12 py-6 rounded-3xl text-xl font-semibold hover:bg-zinc-100 transition">
      Créer une annonce
      </button>
      </div>
    )}

    {activeTab === 'profile' && (
      <div className="py-20 text-center">
      <div className="text-7xl mb-6">👤</div>
      <h2 className="text-4xl font-semibold">Mon Espace</h2>
      <p className="text-zinc-400 mt-4">Ventes, historique et statistiques</p>
      </div>
    )}
    </main>
    </div>
  );
}
