import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import gsap from 'gsap'
import {
  Asterisk, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell,
  BriefcaseBusiness, CalendarDays, CarFront, ChartNoAxesColumnIncreasing,
  CheckCircle2, ChevronDown, ChevronRight, Coffee, Copy,
  CreditCard, Eye, EyeOff, House, Landmark, LayoutDashboard, LifeBuoy, LockKeyhole,
  Mail, MessageCircle, MessagesSquare, Plane, Plus, ShieldCheck,
  ShoppingBasket, Sparkles, TrendingUp, UserRound, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Page = 'overview' | 'activity' | 'cards' | 'insights' | 'account' | 'assistant'
type Filter = 'all' | 'income' | 'expense'
type Modal = 'send' | 'confirm' | 'deposit' | 'limit' | 'notifications' | 'support' | 'account' | 'security' | null
type ChatMessage = { role: 'assistant' | 'user'; text: string }
type Transaction = {
  name: string
  category: string
  date: string
  amount: number
  icon: LucideIcon
  group: 'today' | 'yesterday' | 'earlier'
}

const initialTransactions: Transaction[] = [
  { name: 'Whole Foods Market', category: 'Groceries · Visa debit', date: 'Today, 10:42 AM', amount: -68.42, icon: ShoppingBasket, group: 'today' },
  { name: 'Monthly salary', category: 'Income · Acme Studio', date: 'Today, 9:15 AM', amount: 5420, icon: BriefcaseBusiness, group: 'today' },
  { name: 'Blue Bottle Coffee', category: 'Coffee · Visa debit', date: 'Yesterday, 3:28 PM', amount: -7.5, icon: Coffee, group: 'yesterday' },
  { name: 'Uber trip', category: 'Transport · Visa debit', date: 'Yesterday, 11:06 AM', amount: -23.8, icon: CarFront, group: 'yesterday' },
  { name: 'Transfer to savings', category: 'Savings · Internal transfer', date: 'Sep 25, 8:30 AM', amount: -400, icon: Landmark, group: 'earlier' },
  { name: 'Airbnb', category: 'Travel · Visa debit', date: 'Sep 24, 6:52 PM', amount: -189, icon: House, group: 'earlier' },
  { name: 'Freelance project', category: 'Income · Brightside Co.', date: 'Sep 23, 1:14 PM', amount: 820, icon: BriefcaseBusiness, group: 'earlier' },
  { name: 'Trader Joe’s', category: 'Groceries · Visa debit', date: 'Sep 22, 11:39 AM', amount: -54.37, icon: ShoppingBasket, group: 'earlier' },
]

const navItems: { id: Page; label: string; mobileLabel: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', mobileLabel: 'Home', icon: LayoutDashboard },
  { id: 'activity', label: 'Activity', mobileLabel: 'Activity', icon: ArrowLeftRight },
  { id: 'cards', label: 'My cards', mobileLabel: 'Cards', icon: CreditCard },
  { id: 'insights', label: 'Insights', mobileLabel: 'Insights', icon: ChartNoAxesColumnIncreasing },
  { id: 'account', label: 'My account', mobileLabel: 'Account', icon: UserRound },
]

const pageTitles: Record<Page, string> = {
  overview: 'Here’s your money at a glance.',
  activity: 'Every move, made clear.',
  cards: 'Your cards, your call.',
  insights: 'A clearer view of your money.',
  account: 'Your details, all together.',
  assistant: 'A little clarity, whenever you need it.',
}

const chartData: Record<string, { bars: number[]; total: string; note: string }> = {
  'This month': { bars: [37, 58, 43, 76, 52, 88, 60], total: '$2,840.32', note: '$1,159.68 left' },
  'Last month': { bars: [47, 68, 56, 62, 80, 50, 70], total: '$3,210.18', note: 'View spending insights' },
  'Last 3 months': { bars: [42, 63, 50, 82, 56, 73, 46], total: '$8,460.50', note: 'View spending insights' },
}

function money(value: number) {
  return `$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function assistantReply(question: string, balance: number, transactions: Transaction[]) {
  const query = question.toLowerCase()
  if (/balance|available funds|available money/.test(query)) return `Your available balance is ${money(balance)} USD across your Northstar accounts. You can hide it anytime with the eye button on your overview.`
  if (/spend|spent|budget|outgoing/.test(query)) return 'You’ve spent $2,840.32 this month against your $4,000 budget, leaving $1,159.68. Your dashboard’s spending period menu can show last month or the last three months too.'
  if (/transaction|payment|purchase|activity|merchant/.test(query)) {
    const recent = transactions.slice(0, 3).map((item) => `${item.name} (${item.amount < 0 ? '−' : '+'}${money(item.amount)})`).join(', ')
    return `Your latest activity includes ${recent}. Open Activity in the navigation to review the full list.`
  }
  if (/transfer|send|pay someone/.test(query)) return 'To send money, choose Send money on your overview, select a recipient, enter an amount, then review and confirm. I can explain the steps, but you stay in control of every transfer.'
  if (/card|freeze|online|contactless/.test(query)) return 'Open My cards to freeze or reactivate your debit card, manage online and contactless payments, or update your daily spending limit.'
  if (/sav|goal|lisbon|rainy|interest/.test(query)) return 'Your Lisbon goal is 65% funded ($3,250 of $5,000), and your rainy day fund is at 82%. Savings earned $42.18 in interest this month.'
  if (/account|routing|security|support|help/.test(query)) return 'Your account details, security settings, notification preferences, and support options are available from My account. Sensitive account numbers stay masked in this demo.'
  return 'I can help you understand your balance, spending, recent activity, savings goals, cards, or how to make a transfer. What would you like to know?'
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const Icon = transaction.icon
  return (
    <article className="transaction-row grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3">
      <span className="transaction-icon"><Icon size={16} strokeWidth={1.8} /></span>
      <div className="transaction-info min-w-0">
        <strong>{transaction.name}</strong>
        <span>{transaction.category}</span>
      </div>
      <div className="transaction-amount text-right">
        <strong className={transaction.amount > 0 ? 'amount-positive' : ''}>{transaction.amount < 0 ? '−' : '+'}{money(transaction.amount)}</strong>
        <span>{transaction.date}</span>
      </div>
    </article>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <button className="switch" type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} />
}

function App() {
  const [page, setPage] = useState<Page>('overview')
  const [filter, setFilter] = useState<Filter>('all')
  const [period, setPeriod] = useState('This month')
  const [balance, setBalance] = useState(24680.5)
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [modal, setModal] = useState<Modal>(null)
  const [draft, setDraft] = useState<{ recipient: string; amount: number; note: string } | null>(null)
  const [limit, setLimit] = useState(2500)
  const [toggles, setToggles] = useState<Record<string, boolean>>({ online: true, contactless: true, freeze: false })
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Hi Olivia, I’m Northstar Assist. Ask me about your balance, spending, transactions, savings goals, or card controls.' }])
  const rootRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo('.page-enter', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' })
      gsap.fromTo('.reveal', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.42, stagger: 0.07, delay: 0.08, ease: 'power2.out' })
    }, rootRef)
    return () => context.revert()
  }, [page])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const notify = (message: string) => {
    setToast(message)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800)
  }

  const navigate = (nextPage: Page) => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const askAssistant = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    setChatMessages((current) => [...current, { role: 'user', text: trimmed }, { role: 'assistant', text: assistantReply(trimmed, balance, transactions) }])
    setPage('assistant')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filteredTransactions = transactions.filter((item) => filter === 'all' || (filter === 'income' ? item.amount > 0 : item.amount < 0))

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setDraft({ recipient: String(data.get('recipient')), amount: Number(data.get('amount')), note: String(data.get('note') ?? '') })
    setModal('confirm')
  }

  const confirmTransfer = () => {
    if (!draft) return
    const name = draft.recipient.split(' ·')[0]
    setBalance((current) => current - draft.amount)
    setTransactions((current) => [{ name: `Transfer to ${name}`, category: 'Transfer · Everyday account', date: 'Today, just now', amount: -draft.amount, icon: ArrowUpRight, group: 'today' }, ...current])
    setModal(null)
    setDraft(null)
    notify(`${money(draft.amount)} sent to ${name}.`)
  }

  const handleDeposit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const amount = Number(data.get('amount'))
    setBalance((current) => current + amount)
    setTransactions((current) => [{ name: 'Bank deposit', category: `Deposit · ${String(data.get('source'))}`, date: 'Today, just now', amount, icon: ArrowDownLeft, group: 'today' }, ...current])
    setModal(null)
    notify(`${money(amount)} deposit requested.`)
  }

  const toggle = (key: string, label: string) => {
    const enabled = !toggles[key]
    setToggles((current) => ({ ...current, [key]: enabled }))
    notify(key === 'freeze' ? (enabled ? 'Your card is frozen.' : 'Your card is active again.') : `${label} ${enabled ? 'enabled' : 'disabled'}.`)
  }

  const headingGreeting = (() => {
    const hour = new Date().getHours()
    return `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, Olivia`
  })()

  return (
    <div className="app-shell min-h-screen" ref={rootRef}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand"><span className="brand-mark"><Asterisk size={18} /></span><span>northstar</span></div>
        <div className="nav-label">Workspace</div>
        <nav className="nav-list">{navItems.slice(0, 4).map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => navigate(item.id)} />)}</nav>
        <div className="nav-label">Personal</div>
        <nav className="nav-list">
          <NavButton item={navItems[4]} active={page === 'account'} onClick={() => navigate('account')} />
          <button className={`nav-item ${page === 'assistant' ? 'active' : ''}`} aria-current={page === 'assistant' ? 'page' : undefined} onClick={() => navigate('assistant')}><Sparkles size={18} />Ask Northstar</button>
          <button className="nav-item" onClick={() => setModal('support')}><LifeBuoy size={18} />Help &amp; support</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><MessagesSquare size={16} /></span><strong>Here when you need us</strong><p>Real people, ready to help.</p><button className="help-link" onClick={() => setModal('support')}>Talk to our team <ArrowUpRight size={13} /></button></div>
          <div className="sidebar-profile"><Avatar /><div className="profile-meta"><strong>Olivia Rhye</strong><span>Personal account</span></div><button className="icon-button" aria-label="Account settings" onClick={() => navigate('account')}><ChevronDown size={16} /></button></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar flex items-center justify-between gap-4">
          <div className="welcome"><div className="welcome-kicker">{headingGreeting}</div><h1>{pageTitles[page]}</h1></div>
          <div className="top-actions"><div className="date-pill"><CalendarDays size={15} /><span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div><button className="assistant-launch" onClick={() => navigate('assistant')} aria-label="Ask Northstar assistant"><Sparkles size={16} /><span>Ask Northstar</span></button><div className="notification-wrap"><button className="icon-button" aria-label="Notifications" onClick={() => setModal('notifications')}><Bell size={17} /></button><span className="notification-dot" /></div><Avatar className="top-avatar" /></div>
        </header>

        <div className="content">
          {page === 'overview' && <section className="page-enter" aria-label="Account overview">
            <div className="overview-grid">
              <div className="reveal">
                <div className="section-heading"><div><h2>Your total balance</h2><p>Across all your accounts</p></div><button className="text-button" onClick={() => navigate('account')}>Account details <ArrowUpRight size={14} /></button></div>
                <div className="balance-card"><div className="balance-head">Available balance <button className="icon-button balance-eye" aria-label={balanceVisible ? 'Hide balance' : 'Show balance'} onClick={() => setBalanceVisible((visible) => !visible)}>{balanceVisible ? <Eye size={14} /> : <EyeOff size={14} />}</button></div><div className="balance-number"><span>{balanceVisible ? money(balance) : '••••••'}</span><small>USD</small></div><div className="balance-foot"><span>Everyday account ·· 4829</span><span className="trend"><TrendingUp size={13} />8.2% this month</span></div></div>
                <div className="quick-actions"><button className="action-button primary" onClick={() => setModal('send')}><ArrowUpRight size={15} />Send money</button><button className="action-button" onClick={() => setModal('deposit')}><Plus size={15} />Add money</button></div>
              </div>
              <section className="spending-card reveal" aria-label="Monthly spending"><div className="spending-head"><div><h3>Spending this month</h3><p>Your outgoings at a glance</p></div><select className="month-select" value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Spending period"><option>This month</option><option>Last month</option><option>Last 3 months</option></select></div><div className="spending-total">{chartData[period].total}<span>{period === 'This month' ? 'of $4,000 budget' : 'total spending'}</span></div><div className="chart" aria-label="Weekly spending chart">{chartData[period].bars.map((height, index) => <span className={`chart-column ${index === 5 ? 'current' : ''}`} key={`${period}-${index}`}><i style={{ height: `${height}%` }} />{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span>)}</div><div className="spending-legend"><span className="legend-dot" />{period}<span className="legend-note">{chartData[period].note}</span></div></section>
            </div>
            <div className="lower-grid">
              <section className="transactions-card reveal" aria-label="Recent transactions"><div className="section-heading"><div><h2>Recent activity</h2><p>Your latest transactions</p></div><button className="text-button" onClick={() => navigate('activity')}>See all <ArrowRight size={14} /></button></div><FilterTabs filter={filter} setFilter={setFilter} /><div className="transaction-list">{filteredTransactions.slice(0, 5).map((item, index) => <TransactionRow transaction={item} key={`${item.name}-${index}`} />)}{filteredTransactions.length === 0 && <p className="empty-state">No transactions in this category.</p>}</div></section>
              <aside className="insights-card reveal"><div className="section-heading"><div><h2>Financial snapshot</h2><p>A little progress goes a long way</p></div><button className="text-button" aria-label="More financial insights" onClick={() => navigate('insights')}><ArrowUpRight size={15} /></button></div><Goal icon={Plane} title="Summer in Lisbon" amount="$3,250" detail="$3,250 of $5,000 saved" progress={65} /><Goal icon={ShieldCheck} title="Rainy day fund" amount="82%" detail="You’re building a good buffer" progress={82} /><div className="tip-card"><span className="tip-label"><Sparkles size={13} />A good thing to know</span><p>Your savings earned <strong>$42.18</strong> in interest this month. Nice work letting your money grow.</p></div></aside>
            </div>
          </section>}

          {page === 'activity' && <section className="page-enter"><PageIntro title="Your activity" subtitle="Every little detail, all in one place." /><div className="activity-panel reveal">{(['today', 'yesterday', 'earlier'] as const).map((group) => <div key={group}><div className="activity-date">{group === 'today' ? 'TODAY' : group === 'yesterday' ? 'YESTERDAY' : 'EARLIER THIS WEEK'}</div><div className="transaction-list">{transactions.filter((item) => item.group === group).map((item, index) => <TransactionRow transaction={item} key={`${group}-${item.name}-${index}`} />)}{!transactions.some((item) => item.group === group) && <p className="empty-state">No transactions yet.</p>}</div></div>)}</div></section>}

          {page === 'cards' && <section className="page-enter"><PageIntro title="Your cards" subtitle="Stay in control of how and where you spend." /><div className="card-management reveal"><div className="bank-card"><div className="bank-card-top"><span>northstar</span><span>DEBIT</span></div><div className="bank-card-chip" /><div className="bank-card-number">•••• &nbsp;•••• &nbsp;•••• &nbsp;4829</div><div className="bank-card-bottom"><span>Olivia Rhye</span><span>VISA&nbsp; · &nbsp;08/29</span></div></div><div className="card-controls"><h3>Everyday debit</h3><p>Physical card · ending in 4829</p><ControlRow title="Freeze card" detail="Temporarily stop all card transactions"><Toggle label="Freeze card" checked={toggles.freeze} onChange={() => toggle('freeze', 'Freeze card')} /></ControlRow><ControlRow title="Online payments" detail="Allow purchases on websites and apps"><Toggle label="Online payments" checked={toggles.online} onChange={() => toggle('online', 'Online payments')} /></ControlRow><ControlRow title="Contactless payments" detail="Tap to pay in person"><Toggle label="Contactless payments" checked={toggles.contactless} onChange={() => toggle('contactless', 'Contactless payments')} /></ControlRow><ControlRow title="Card spending limit" detail={`${money(limit)} daily spending limit`}><button className="icon-button" aria-label="Edit card spending limit" onClick={() => setModal('limit')}><ChevronRight size={16} /></button></ControlRow></div></div></section>}

          {page === 'insights' && <section className="page-enter"><PageIntro title="Your money, making sense." subtitle="A clear picture of where you are and where you’re going." /><div className="insight-detail reveal"><Metric title="Income this month" amount="$5,420.00" note="↑ 6.4% from last month" /><Metric title="Spent this month" amount="$2,840.32" note="On track with your monthly budget" /><Metric title="Saved this month" amount="$1,260.00" note="↑ $210 more than last month" /><Metric title="Savings interest" amount="$42.18" note="Earned automatically this month" /></div><div className="detail-panel reveal"><h3>Your spending breakdown</h3><Breakdown title="Home & bills" amount="$1,140.00" progress={40} color="#527c5e" /><Breakdown title="Food & groceries" amount="$684.22" progress={24} color="#a9d469" /><Breakdown title="Shopping & lifestyle" amount="$598.10" progress={21} color="#e99b76" /><Breakdown title="Transport & other" amount="$418.00" progress={15} color="#a8b8a6" /></div></section>}

          {page === 'account' && <section className="page-enter"><PageIntro title="Your account" subtitle="The details that make this account yours." /><div className="account-panel reveal"><h3>Personal details</h3><p>Your information, kept private and secure.</p><AccountRow icon={UserRound} title="Full name" detail="Olivia Rhye" onClick={() => notify('Your verified details are up to date.')} /><AccountRow icon={Mail} title="Email address" detail="olivia.rhye@email.com" onClick={() => notify('Your verified details are up to date.')} /><AccountRow icon={CreditCard} title="Everyday account" detail="•••• •••• •••• 4829 · USD" onClick={() => setModal('account')} /><AccountRow icon={ShieldCheck} title="Security & privacy" detail="Passkeys, devices and privacy settings" onClick={() => setModal('security')} /><AccountRow icon={Bell} title="Notifications" detail="Choose what you’d like to hear about" onClick={() => setModal('notifications')} /></div></section>}

          {page === 'assistant' && <section className="page-enter"><PageIntro title="Ask Northstar" subtitle="Clear answers about your money, right when you need them." /><AssistantChat messages={chatMessages} onAsk={askAssistant} /></section>}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">{navItems.map((item) => <NavButton key={item.id} item={item} active={page === item.id} onClick={() => navigate(item.id)} mobile />)}</nav>

      {modal && <ModalView modal={modal} draft={draft} limit={limit} onClose={() => setModal(null)} onSend={handleSend} onConfirm={confirmTransfer} onDeposit={handleDeposit} onLimit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); setLimit(Number(data.get('limit'))); setModal(null); notify('Your daily limit was updated.') }} onToggle={toggle} toggles={toggles} />}

      <div className={`toast ${toastVisible ? 'show' : ''}`} role="status"><CheckCircle2 size={16} /><span>{toast}</span></div>
    </div>
  )
}

function NavButton({ item, active, onClick, mobile = false }: { item: (typeof navItems)[number]; active: boolean; onClick: () => void; mobile?: boolean }) {
  const Icon = item.icon
  return <button className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={onClick}><Icon size={18} strokeWidth={1.8} /><span>{mobile ? item.mobileLabel : item.label}</span></button>
}

function Avatar({ className = '' }: { className?: string }) {
  return <img className={`avatar ${className}`} src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=96&h=96&q=80" alt="Olivia Rhye" referrerPolicy="no-referrer" />
}

function FilterTabs({ filter, setFilter }: { filter: Filter; setFilter: (filter: Filter) => void }) {
  return <div className="filter-tabs" role="tablist" aria-label="Filter transactions">{(['all', 'income', 'expense'] as const).map((item) => <button className={`filter-tab ${filter === item ? 'active' : ''}`} role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} key={item}>{item === 'all' ? 'All' : item === 'income' ? 'Income' : 'Expenses'}</button>)}</div>
}

function Goal({ icon: Icon, title, amount, detail, progress }: { icon: LucideIcon; title: string; amount: string; detail: string; progress: number }) {
  return <div className="goal-card"><span className="goal-icon"><Icon size={16} /></span><div className="goal-copy"><strong>{title}<span>{amount}</span></strong><p>{detail}</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div></div>
}

function PageIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return <><h2 className="page-title">{title}</h2><p className="page-subtitle">{subtitle}</p></>
}

function ControlRow({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  return <div className="control-row"><div><strong>{title}</strong><span>{detail}</span></div>{children}</div>
}

function Metric({ title, amount, note }: { title: string; amount: string; note: string }) {
  return <div className="metric-panel"><span>{title}</span><strong>{amount}</strong><p>{note}</p></div>
}

function Breakdown({ title, amount, progress, color }: { title: string; amount: string; progress: number; color: string }) {
  return <div className="breakdown"><p>{title}<strong>{amount}</strong></p><div className="progress-track"><span style={{ width: `${progress}%`, background: color }} /></div></div>
}

function AccountRow({ icon: Icon, title, detail, onClick }: { icon: LucideIcon; title: string; detail: string; onClick: () => void }) {
  return <button className="account-row" onClick={onClick}><Icon size={17} /><span className="profile-meta"><strong>{title}</strong><span>{detail}</span></span><ChevronRight size={16} /></button>
}

function ModalView({ modal, draft, limit, onClose, onSend, onConfirm, onDeposit, onLimit, onToggle, toggles }: {
  modal: Exclude<Modal, null>
  draft: { recipient: string; amount: number; note: string } | null
  limit: number
  onClose: () => void
  onSend: (event: FormEvent<HTMLFormElement>) => void
  onConfirm: () => void
  onDeposit: (event: FormEvent<HTMLFormElement>) => void
  onLimit: (event: FormEvent<HTMLFormElement>) => void
  onToggle: (key: string, label: string) => void
  toggles: Record<string, boolean>
}) {
  const titles: Record<Exclude<Modal, null>, [string, string]> = {
    send: ['Send money', 'A little help is on the way.'], confirm: ['Confirm transfer', 'Please check the details before sending.'],
    deposit: ['Add money', 'Move money into your Northstar account.'], limit: ['Card spending limit', 'Set a daily limit for new purchases.'],
    notifications: ['Notifications', 'The updates that matter to you.'], support: ['We’re here for you', 'Talk to a real person, whenever you need.'],
    account: ['Everyday account', 'Your account details for incoming payments.'], security: ['Security & privacy', 'Your account, protected around the clock.'],
  }
  const [title, subtitle] = titles[modal]
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><X size={16} /></button></div>
    {modal === 'send' && <form onSubmit={onSend}><Field label="Send to"><select name="recipient" required defaultValue=""><option value="" disabled>Choose a recipient</option><option>Alex Morgan ···· 2084</option><option>Jamie Chen ···· 6191</option><option>My savings · Internal account</option></select></Field><Field label="Amount"><div className="amount-input-wrap"><span>$</span><input name="amount" type="number" min="0.01" max="24680.5" step="0.01" placeholder="0.00" required /></div></Field><Field label="Note (optional)"><input name="note" type="text" maxLength={60} placeholder="What’s it for?" /></Field><div className="modal-note"><ShieldCheck size={14} /><span>Transfers are protected and usually arrive within minutes. No transfer fee.</span></div><button className="action-button primary modal-submit" type="submit">Review transfer <ArrowRight size={15} /></button></form>}
    {modal === 'confirm' && draft && <><div className="detail-panel confirm-panel"><p>You’re sending</p><h3>{money(draft.amount)}</h3><p>To <strong>{draft.recipient}</strong></p>{draft.note && <p>Note: {draft.note}</p>}</div><button className="action-button primary modal-submit" onClick={onConfirm}>Confirm and send <ArrowUpRight size={15} /></button></>}
    {modal === 'deposit' && <form onSubmit={onDeposit}><Field label="Amount"><div className="amount-input-wrap"><span>$</span><input name="amount" type="number" min="1" max="10000" step="0.01" placeholder="0.00" required /></div></Field><Field label="From"><select name="source"><option>Chase checking ···· 7402</option><option>Wells Fargo savings ···· 1320</option></select></Field><div className="modal-note"><CalendarDays size={14} /><span>Bank transfers typically arrive in 1–2 business days.</span></div><button className="action-button primary modal-submit" type="submit">Continue</button></form>}
    {modal === 'limit' && <form onSubmit={onLimit}><Field label="Daily spending limit"><div className="amount-input-wrap"><span>$</span><input name="limit" type="number" min="100" max="10000" step="100" defaultValue={limit} /></div></Field><button className="action-button primary modal-submit" type="submit">Save limit</button></form>}
    {modal === 'notifications' && <><ControlRow title="Card transactions" detail="Get notified when your card is used"><Toggle label="Card transactions notifications" checked={toggles['notify-card'] ?? true} onChange={() => onToggle('notify-card', 'Card notifications')} /></ControlRow><ControlRow title="Money in and out" detail="Transfers, deposits and bill payments"><Toggle label="Money notifications" checked={toggles['notify-money'] ?? true} onChange={() => onToggle('notify-money', 'Money notifications')} /></ControlRow><ControlRow title="Tips and insights" detail="Helpful ideas for your finances"><Toggle label="Tips and insights notifications" checked={toggles['notify-tips'] ?? false} onChange={() => onToggle('notify-tips', 'Tips and insights')} /></ControlRow><button className="action-button primary modal-submit" onClick={onClose}>Done</button></>}
    {modal === 'support' && <><InfoRow icon={MessageCircle} title="Start a conversation" detail="Typically replies in a few minutes" /><InfoRow icon={CreditCard} title="Call us" detail="1 (800) 555-0198 · Available 24/7" /><InfoRow icon={Mail} title="Email" detail="hello@northstar.example" /></>}
    {modal === 'account' && <><InfoRow icon={Copy} title="Account number" detail="•••• •••• 4829" /><InfoRow icon={Copy} title="Routing number" detail="•••• 0921" /><InfoRow icon={Landmark} title="Account type" detail="Checking · USD" /><div className="modal-note"><LockKeyhole size={14} /><span>Account details are only visible to you.</span></div></>}
    {modal === 'security' && <><InfoRow icon={ShieldCheck} title="Passkey" detail="Faster, more secure sign-in · On" /><InfoRow icon={UserRound} title="Trusted devices" detail="iPhone 15 · This device" /><InfoRow icon={LockKeyhole} title="Two-factor authentication" detail="Extra protection at sign-in · On" /></>}
  </section></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>
}

function InfoRow({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return <div className="info-row"><Icon size={16} /><div className="profile-meta"><strong>{title}</strong><span>{detail}</span></div></div>
}

function AssistantChat({ messages, onAsk }: { messages: ChatMessage[]; onAsk: (question: string) => void }) {
  const [question, setQuestion] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onAsk(question)
    setQuestion('')
  }

  return <section className="assistant-chat reveal" aria-label="Chat with Northstar Assist">
    <div className="assistant-chat-head"><span className="assistant-avatar"><Sparkles size={18} /></span><div><strong>Northstar Assist</strong><span>Personal banking guide · Available now</span></div><span className="online-dot" aria-label="Online" /></div>
    <div className="assistant-messages" aria-live="polite">
      {messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="message-avatar">{message.role === 'assistant' ? <Sparkles size={14} /> : <UserRound size={14} />}</span><p>{message.text}</p></div>)}
      <div ref={endRef} />
    </div>
    {messages.length === 1 && <div className="suggested-questions"><span>TRY ASKING</span><div><button onClick={() => onAsk('What is my available balance?')}>What’s my available balance?</button><button onClick={() => onAsk('How much have I spent this month?')}>How much have I spent?</button><button onClick={() => onAsk('How do I send money?')}>How do I send money?</button><button onClick={() => onAsk('How are my savings goals doing?')}>How are my savings goals?</button></div></div>}
    <form className="assistant-composer" onSubmit={submit}><input aria-label="Ask a question" placeholder="Ask a question about your money..." value={question} onChange={(event) => setQuestion(event.target.value)} /><button className="action-button primary" type="submit" disabled={!question.trim()} aria-label="Send question"><ArrowUpRight size={17} /></button></form>
    <p className="assistant-disclaimer">Northstar Assist shares general account information, not financial advice. Review and confirm all transactions yourself.</p>
  </section>
}

export default App