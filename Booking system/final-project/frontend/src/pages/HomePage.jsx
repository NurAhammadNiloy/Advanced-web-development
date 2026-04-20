import Hero from '../components/Hero.jsx';
import BookingsSection from '../components/BookingsSection.jsx';

function HomePage({ showToast }) {
  return (
    <>
      <Hero />
      <BookingsSection />
    </>
  );
}

export default HomePage;