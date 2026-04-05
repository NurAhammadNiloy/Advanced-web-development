import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import BookingsSection from './components/BookingsSection.jsx'
import Footer from './components/Footer.jsx'

function App() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-6 flex-grow">
        <Hero />
        <BookingsSection />
      </main>
      <Footer />
    </>
  )
}

export default App
