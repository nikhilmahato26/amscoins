import { cn } from '@/lib/utils'
import { Link } from 'react-router'
import { inr, pct } from '@/lib/format'
import { MOCK_COINS } from '@/mocks/coins'
import { 
  Users, ArrowRight, TrendingUp, ShieldCheck, 
  MapPin, HeadphonesIcon, Download, Upload, 
  History, UserPlus, User, Lock, Zap
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-foreground font-sans selection:bg-brass/20 relative overflow-hidden flex flex-col">
      {/* Abstract Backgrounds */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[1000px] h-[800px] bg-rust/10 rounded-full blur-[150px] pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
      
      {/* 1. Navbar */}
      <nav className="relative z-50 border-b border-ink-3/50 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-24 flex items-center justify-between">
          
          <Link to="/" className="flex items-center gap-3">
            <svg viewBox="0 0 40 40" className="w-14 h-14 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0L40 40H0L20 0Z" fill="url(#paint0_linear_logo)"/>
              <path d="M20 8L36 40H4L20 8Z" fill="#000000"/>
              <path d="M20 16L30.5 37H9.5L20 16Z" fill="url(#paint1_linear_logo)"/>
              <defs>
                <linearGradient id="paint0_linear_logo" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8A33D7"/>
                  <stop offset="1" stopColor="#F59E0B"/>
                </linearGradient>
                <linearGradient id="paint1_linear_logo" x1="20" y1="16" x2="20" y2="37" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F59E0B"/>
                  <stop offset="1" stopColor="#FBBF24"/>
                </linearGradient>
              </defs>
            </svg>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wider text-paper leading-none">ASM COINS</h1>
              <p className="text-[10px] tracking-[0.25em] text-mist/80 uppercase mt-1">Invest • Grow • Prosper</p>
            </div>
          </Link>

          <div className="hidden xl:flex items-center gap-10 text-sm font-medium tracking-wide">
            <Link to="#" className="text-rust">HOME</Link>
            <Link to="#" className="text-paper hover:text-rust transition-colors">ABOUT US</Link>
            <Link to="#" className="text-paper hover:text-rust transition-colors">INVESTMENTS</Link>
            <Link to="#" className="text-paper hover:text-rust transition-colors">AFFILIATE</Link>
            <Link to="#" className="text-paper hover:text-rust transition-colors">CONTACT US</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className={cn(buttonVariants({ variant: 'outline' }), "border-ink-3 text-paper hover:text-brass hover:bg-ink-2 bg-transparent rounded px-6 h-11")}>
              <User className="w-4 h-4 mr-2 text-mist" />
              LOGIN
            </Link>
            <Link to="/register" className={cn(buttonVariants({ variant: 'outline' }), "hidden sm:flex border-patina/40 text-paper hover:bg-patina/10 bg-transparent rounded px-6 h-11")}>
              <UserPlus className="w-4 h-4 mr-2 text-patina" />
              REFERRAL
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. Main Dashboard Grid */}
      <main className="flex-1 relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 lg:py-12 flex flex-col xl:flex-row gap-12 lg:gap-8 justify-between">
        
        {/* LEFT COLUMN */}
        <div className="flex-1 max-w-2xl flex flex-col xl:pr-12">
          
          <h2 className="text-5xl md:text-[3.5rem] font-display font-bold leading-[1.1] mb-6">
            <span className="text-paper">SMART INVESTMENT</span><br />
            <span className="text-rust">SECURE FUTURE</span>
          </h2>
          
          <p className="text-mist/80 text-base md:text-lg mb-10 max-w-md leading-relaxed">
            ASM Coins is a trusted investment platform empowering people of India to build wealth and achieve financial freedom.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 mb-14">
            <Link to="/login" className={cn(buttonVariants({ variant: 'default' }), "bg-gradient-to-r from-rust to-[#5B1E96] hover:opacity-90 text-white border-0 px-8 h-14 rounded-md text-sm font-bold tracking-wider group shadow-[0_0_20px_rgba(138,51,215,0.3)] w-full sm:w-auto")}>
              START INVESTING 
              <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="#plans" className={cn(buttonVariants({ variant: 'outline' }), "border-brass/30 text-paper hover:bg-brass/10 px-8 h-14 rounded-md text-sm font-bold tracking-wider bg-transparent w-full sm:w-auto")}>
              INVESTMENT PLANS
              <TrendingUp className="w-4 h-4 ml-3 text-brass" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 pt-8 border-t border-ink-3/30">
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-rust" />
                <span className="text-2xl font-data text-paper font-bold">25K+</span>
              </div>
              <span className="text-[11px] text-mist/60 uppercase tracking-wider">Happy Investors</span>
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-rust" />
                <span className="text-2xl font-data text-paper font-bold">₹50Cr+</span>
              </div>
              <span className="text-[11px] text-mist/60 uppercase tracking-wider">Total Investments</span>
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-rust" />
                <span className="text-2xl font-data text-paper font-bold">₹12Cr+</span>
              </div>
              <span className="text-[11px] text-mist/60 uppercase tracking-wider">Total Payouts</span>
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-rust" />
                <span className="text-2xl font-data text-paper font-bold">99.9%</span>
              </div>
              <span className="text-[11px] text-mist/60 uppercase tracking-wider">Uptime & Security</span>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-10 w-full" id="plans">
            <div className="h-px bg-gradient-to-r from-transparent to-brass/50 flex-1"></div>
            <div className="text-brass text-sm font-medium tracking-[0.2em] uppercase">Our Investment Plans</div>
            <div className="h-px bg-gradient-to-l from-transparent to-brass/50 flex-1"></div>
          </div>

          {/* Investment Plans Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Silver */}
            <div className="relative rounded-xl bg-gradient-to-b from-[#1F1F1F] to-[#121212] border border-mist/30 p-1 flex flex-col">
              <div className="bg-[#111111] rounded-lg p-5 flex-1 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-mist/5 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mist to-mist/30 flex items-center justify-center p-[1px] shadow-[0_0_15px_rgba(156,163,175,0.3)]">
                    <div className="w-full h-full bg-[#111111] rounded-full flex items-center justify-center text-mist">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                  </div>
                  <span className="text-mist font-bold tracking-wider text-sm">SILVER PLAN</span>
                </div>
                <div className="flex justify-between items-end mb-8 border-b border-mist/10 pb-4">
                  <div>
                    <div className="text-4xl font-data font-bold text-paper">25%</div>
                    <div className="text-[10px] text-mist/60 uppercase tracking-widest mt-1">Returns</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-data text-patina">36 HOURS</div>
                    <div className="text-[10px] text-mist/60 uppercase tracking-widest mt-1">Duration</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-data mb-6 text-paper/80">
                  <div className="space-y-1">
                    <div className="text-mist/50 text-[10px] uppercase">Min Investment</div>
                    <div>₹1,000</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-mist/50 text-[10px] uppercase">Max Investment</div>
                    <div>₹50,000</div>
                  </div>
                </div>
                <Link to="/login" className="mt-auto w-full py-3 bg-gradient-to-r from-mist/20 to-mist/5 text-paper text-xs font-bold tracking-widest uppercase rounded text-center border border-mist/10 hover:border-mist/30 transition-colors">
                  Invest Now
                </Link>
              </div>
            </div>

            {/* Gold */}
            <div className="relative rounded-xl bg-gradient-to-b from-brass to-[#78350F] p-1 flex flex-col shadow-[0_0_30px_rgba(245,158,11,0.15)] -translate-y-2">
              <div className="bg-[#111111] rounded-lg p-5 flex-1 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brass/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brass to-[#92400E] flex items-center justify-center p-[1px] shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                    <div className="w-full h-full bg-[#111111] rounded-full flex items-center justify-center text-brass">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                  </div>
                  <span className="text-brass font-bold tracking-wider text-sm">GOLD PLAN</span>
                </div>
                <div className="flex justify-between items-end mb-8 border-b border-brass/10 pb-4">
                  <div>
                    <div className="text-4xl font-data font-bold text-paper">30%</div>
                    <div className="text-[10px] text-brass/60 uppercase tracking-widest mt-1">Returns</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-data text-patina">36 HOURS</div>
                    <div className="text-[10px] text-brass/60 uppercase tracking-widest mt-1">Duration</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-data mb-6 text-paper/80">
                  <div className="space-y-1">
                    <div className="text-brass/50 text-[10px] uppercase">Min Investment</div>
                    <div>₹3,000</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-brass/50 text-[10px] uppercase">Max Investment</div>
                    <div>₹5,000</div>
                  </div>
                </div>
                <Link to="/login" className="mt-auto w-full py-3 bg-gradient-to-r from-[#87671b] to-brass text-[#111] text-xs font-bold tracking-widest uppercase rounded text-center hover:opacity-90 transition-opacity">
                  Invest Now
                </Link>
              </div>
            </div>

            {/* Diamond */}
            <div className="relative rounded-xl bg-gradient-to-b from-rust to-[#3B0764] border border-rust/30 p-1 flex flex-col">
              <div className="bg-[#111111] rounded-lg p-5 flex-1 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rust/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rust to-red-900 flex items-center justify-center p-[1px] shadow-[0_0_15px_rgba(138,51,215,0.4)]">
                    <div className="w-full h-full bg-[#111111] rounded-full flex items-center justify-center text-rust">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    </div>
                  </div>
                  <span className="text-rust font-bold tracking-wider text-sm">DIAMOND PLAN</span>
                </div>
                <div className="flex justify-between items-end mb-8 border-b border-rust/10 pb-4">
                  <div>
                    <div className="text-4xl font-data font-bold text-paper">40%</div>
                    <div className="text-[10px] text-rust/60 uppercase tracking-widest mt-1">Returns</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-data text-patina">36 HOURS</div>
                    <div className="text-[10px] text-rust/60 uppercase tracking-widest mt-1">Duration</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-data mb-6 text-paper/80">
                  <div className="space-y-1">
                    <div className="text-rust/50 text-[10px] uppercase">Min Investment</div>
                    <div>₹5,000</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-rust/50 text-[10px] uppercase">Max Investment</div>
                    <div>₹5,00,000</div>
                  </div>
                </div>
                <Link to="/login" className="mt-auto w-full py-3 bg-gradient-to-r from-[#6b1c11] to-rust text-white text-xs font-bold tracking-widest uppercase rounded text-center hover:opacity-90 transition-opacity">
                  Invest Now
                </Link>
              </div>
            </div>
            
          </div>
        </div>

        {/* CENTER COLUMN (Logo Graphic) */}
        <div className="hidden xl:flex flex-col items-center justify-center relative w-[300px] shrink-0">
          <div className="relative w-64 h-64 flex items-center justify-center">
             {/* Animated Rings */}
             <div className="absolute inset-0 border-[3px] border-rust rounded-full animate-[spin_30s_linear_infinite] opacity-60"></div>
             <div className="absolute inset-[-12px] border border-rust/30 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
             <div className="absolute inset-[-24px] border border-rust/10 rounded-full"></div>
             
             {/* Inner Glow */}
             <div className="absolute inset-4 bg-rust/10 rounded-full blur-xl"></div>
             
             {/* Big Logo */}
             <svg viewBox="0 0 40 40" className="w-32 h-32 relative z-10 drop-shadow-[0_0_25px_rgba(245,158,11,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0L40 40H0L20 0Z" fill="url(#paint0_linear_big)"/>
                <path d="M20 8L36 40H4L20 8Z" fill="#000000"/>
                <path d="M20 16L30.5 37H9.5L20 16Z" fill="url(#paint1_linear_big)"/>
                <defs>
                  <linearGradient id="paint0_linear_big" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#8A33D7"/>
                    <stop offset="1" stopColor="#F59E0B"/>
                  </linearGradient>
                  <linearGradient id="paint1_linear_big" x1="20" y1="16" x2="20" y2="37" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F59E0B"/>
                    <stop offset="1" stopColor="#FBBF24"/>
                  </linearGradient>
                </defs>
             </svg>
          </div>
          
          <div className="mt-8 text-center">
            <h2 className="font-display text-3xl font-bold tracking-widest text-paper/90 mb-1">ASM COINS</h2>
            <div className="flex items-center justify-center gap-2 text-[9px] tracking-[0.3em] text-mist/70 uppercase">
              <span>Invest</span>
              <span className="w-1 h-1 bg-rust rounded-full"></span>
              <span>Grow</span>
              <span className="w-1 h-1 bg-brass rounded-full"></span>
              <span>Prosper</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 max-w-[500px] flex flex-col gap-6 w-full xl:max-w-md mx-auto xl:mx-0">
          
          {/* India Banner */}
          <div className="relative rounded-xl border border-ink-3/40 bg-gradient-to-r from-ink/80 to-ink-2/80 p-6 overflow-hidden flex items-center justify-between shadow-lg">
             <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
             {/* Fake red chart bars in bg */}
             <div className="absolute right-4 bottom-0 flex items-end gap-1 opacity-20">
               {[20,35,25,45,30,55,40,65,50,75,60,85,70,95].map((h, i) => (
                 <div key={i} className="w-1.5 bg-rust rounded-t-sm" style={{height: `${h}px`}}></div>
               ))}
             </div>
             
             <div className="flex items-center gap-4 relative z-10">
               <div className="w-12 h-12 rounded-full bg-rust/20 flex items-center justify-center text-rust shrink-0 shadow-[0_0_15px_rgba(138,51,215,0.3)]">
                  <MapPin className="w-6 h-6" />
               </div>
               <div>
                 <div className="text-xl font-bold tracking-widest text-paper mb-1">INDIA</div>
                 <div className="text-[10px] text-mist/70 uppercase tracking-widest leading-relaxed">
                   Our Country, Our Pride<br/>Our Strength
                 </div>
               </div>
             </div>
          </div>

          {/* Info Pills */}
          <div className="grid grid-cols-3 gap-3">
             <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-rust/20 bg-ink-2/30">
               <ShieldCheck className="w-5 h-5 text-rust opacity-80" />
               <div className="text-center">
                 <div className="text-[10px] font-bold text-paper mb-0.5">100% SECURE</div>
                 <div className="text-[8px] text-mist/60">SSL Encrypted</div>
               </div>
             </div>
             <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-rust/20 bg-ink-2/30">
               <Zap className="w-5 h-5 text-rust opacity-80" />
               <div className="text-center">
                 <div className="text-[10px] font-bold text-paper mb-0.5">INSTANT PAYOUT</div>
                 <div className="text-[8px] text-mist/60">Withdraw Anytime</div>
               </div>
             </div>
             <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-rust/20 bg-ink-2/30">
               <HeadphonesIcon className="w-5 h-5 text-rust opacity-80" />
               <div className="text-center">
                 <div className="text-[10px] font-bold text-paper mb-0.5">24/7 SUPPORT</div>
                 <div className="text-[8px] text-mist/60">Always Here For You</div>
               </div>
             </div>
          </div>

          {/* Live Market Table */}
          <div className="rounded-xl border border-ink-3 bg-[#0a0f18] p-5 shadow-2xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-patina rounded-full animate-pulse shadow-[0_0_8px_#4E9C86]"></div>
                <h3 className="text-sm font-bold tracking-widest text-paper">LIVE MARKET</h3>
              </div>
              <Link to="/login" className="text-[10px] border border-patina/30 text-patina px-3 py-1 rounded hover:bg-patina/10 transition-colors tracking-widest">
                VIEW ALL
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] text-mist/50 uppercase tracking-widest border-b border-ink-3/50">
                    <th className="pb-3 font-medium">Asset</th>
                    <th className="pb-3 text-right font-medium">Price</th>
                    <th className="pb-3 text-right font-medium">24h Change</th>
                    <th className="pb-3 text-right font-medium">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-3/30 text-sm font-data">
                  {MOCK_COINS.map(coin => (
                    <tr key={coin.id} className="group">
                      <td className="py-3.5 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-brass/10 flex items-center justify-center text-brass font-bold text-[10px]">
                          {coin.symbol[0]}
                        </div>
                        <div className="text-xs text-paper/90">{coin.symbol}</div>
                      </td>
                      <td className="py-3.5 text-right text-xs">
                        {coin.symbol.includes('USD') ? `₹${coin.price}` : inr(coin.price * 100)}
                      </td>
                      <td className={`py-3.5 text-right text-xs ${coin.change24h >= 0 ? 'text-patina' : 'text-rust'}`}>
                        {pct(coin.change24h)}
                      </td>
                      <td className="py-3.5 text-right relative">
                        <div className="w-16 h-4 ml-auto overflow-hidden opacity-70 group-hover:opacity-100 transition-opacity">
                           <svg viewBox="0 0 100 20" className={`w-full h-full stroke-current ${coin.change24h >= 0 ? 'text-patina' : 'text-rust'}`} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {/* Simple zigzag based on spark */}
                              <polyline points="0,15 20,5 40,18 60,8 80,12 100,2" />
                           </svg>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-ink-3 bg-[#0a0f18] p-5">
            <h3 className="text-xs font-bold tracking-widest text-paper mb-5">QUICK ACTIONS</h3>
            <div className="grid grid-cols-5 gap-2">
               <Link to="/login" className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-xl border border-patina/30 bg-patina/10 flex items-center justify-center text-patina group-hover:bg-patina/20 transition-colors">
                   <Download className="w-5 h-5" />
                 </div>
                 <div className="text-[9px] uppercase tracking-wider text-mist group-hover:text-paper">Deposit</div>
               </Link>
               <Link to="/login" className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-xl border border-brass/30 bg-brass/10 flex items-center justify-center text-brass group-hover:bg-brass/20 transition-colors">
                   <Upload className="w-5 h-5" />
                 </div>
                 <div className="text-[9px] uppercase tracking-wider text-mist group-hover:text-paper">Withdrawal</div>
               </Link>
               <Link to="/login" className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-xl border border-blue-400/30 bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-400/20 transition-colors">
                   <History className="w-5 h-5" />
                 </div>
                 <div className="text-[9px] uppercase tracking-wider text-mist group-hover:text-paper">Transactions</div>
               </Link>
               <Link to="/login" className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-xl border border-purple-400/30 bg-purple-400/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-400/20 transition-colors">
                   <UserPlus className="w-5 h-5" />
                 </div>
                 <div className="text-[9px] uppercase tracking-wider text-mist group-hover:text-paper">Referral</div>
               </Link>
               <Link to="/login" className="flex flex-col items-center gap-2 group">
                 <div className="w-12 h-12 rounded-xl border border-yellow-500/30 bg-yellow-500/10 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-500/20 transition-colors">
                   <User className="w-5 h-5" />
                 </div>
                 <div className="text-[9px] uppercase tracking-wider text-mist group-hover:text-paper">My Profile</div>
               </Link>
            </div>
          </div>

        </div>
      </main>

      {/* 3. Footer Area */}
      <footer className="relative z-20 border-t border-ink-3/40 bg-[#04070b]">
         
         {/* Trust Bar */}
         <div className="border-b border-ink-3/40">
           <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4 grid grid-cols-2 md:grid-cols-5 gap-6 text-[10px]">
             
             <div className="flex items-center gap-3 text-mist/80">
               <div className="w-6 h-6 rounded-full bg-rust/20 flex items-center justify-center text-rust shrink-0">
                 <Lock className="w-3 h-3" />
               </div>
               <div>
                 <div className="font-bold text-paper mb-0.5 tracking-wider">TRUSTED BY THOUSANDS</div>
                 <div className="leading-tight">Across India</div>
               </div>
             </div>

             <div className="flex items-center gap-3 text-mist/80">
               <div className="w-6 h-6 rounded-full bg-brass/20 flex items-center justify-center text-brass shrink-0">
                 <ShieldCheck className="w-3 h-3" />
               </div>
               <div>
                 <div className="font-bold text-paper mb-0.5 tracking-wider">SECURE & ENCRYPTED</div>
                 <div className="leading-tight">Your Data is 100% Safe</div>
               </div>
             </div>

             <div className="flex items-center gap-3 text-mist/80">
               <div className="w-6 h-6 rounded-full bg-purple-400/20 flex items-center justify-center text-purple-400 shrink-0">
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
               </div>
               <div>
                 <div className="font-bold text-paper mb-0.5 tracking-wider">TRANSPARENT PLATFORM</div>
                 <div className="leading-tight">Clear & Honest System</div>
               </div>
             </div>

             <div className="flex items-center gap-3 text-mist/80">
               <div className="w-6 h-6 rounded-full bg-patina/20 flex items-center justify-center text-patina shrink-0">
                 <Zap className="w-3 h-3" />
               </div>
               <div>
                 <div className="font-bold text-paper mb-0.5 tracking-wider">INSTANT WITHDRAWALS</div>
                 <div className="leading-tight">Quick & Hassle Free</div>
               </div>
             </div>

             <div className="flex items-center gap-3 text-mist/80">
               <div className="w-6 h-6 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400 shrink-0">
                 <HeadphonesIcon className="w-3 h-3" />
               </div>
               <div>
                 <div className="font-bold text-paper mb-0.5 tracking-wider">DEDICATED SUPPORT</div>
                 <div className="leading-tight">24/7 Support Team</div>
               </div>
             </div>

           </div>
         </div>

         {/* Bottom Bar */}
         <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-5 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 40 40" className="w-8 h-8 opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0L40 40H0L20 0Z" fill="url(#p0)"/>
                <path d="M20 8L36 40H4L20 8Z" fill="#000000"/>
                <path d="M20 16L30.5 37H9.5L20 16Z" fill="url(#p1)"/>
                <defs>
                  <linearGradient id="p0" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#8A33D7"/><stop offset="1" stopColor="#F59E0B"/></linearGradient>
                  <linearGradient id="p1" x1="20" y1="16" x2="20" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#F59E0B"/><stop offset="1" stopColor="#FBBF24"/></linearGradient>
                </defs>
              </svg>
              <div>
                <h2 className="font-display text-sm font-bold tracking-wider text-paper/80 leading-none">ASM COINS</h2>
                <p className="text-[7px] tracking-[0.25em] text-mist/60 uppercase mt-1">Invest • Grow • Prosper</p>
              </div>
            </div>

            <div className="text-[10px] text-mist/60 flex items-center gap-2">
              © 2024 ASM COINS. All Rights Reserved. <span className="hidden sm:inline">| Built with <span className="text-rust">❤</span> for India</span>
            </div>

            <div className="flex items-center gap-4 text-mist/50">
               <span className="text-[9px] uppercase tracking-widest font-bold">WE ACCEPT</span>
               <div className="flex gap-3">
                 <div className="h-6 px-2 border border-ink-3 rounded flex items-center text-xs font-bold bg-white text-[#111]">UPI</div>
                 <div className="h-6 px-2 border border-ink-3 rounded flex items-center text-xs font-bold bg-[#002970] text-white">Paytm</div>
                 <div className="h-6 px-2 border border-ink-3 rounded flex items-center text-[10px] font-bold bg-[#5f259f] text-white">PhonePe</div>
                 <div className="h-6 px-2 border border-ink-3 rounded flex items-center text-[10px] font-bold bg-white text-gray-700">G Pay</div>
               </div>
            </div>
         </div>
      </footer>
    </div>
  )
}
