import Header from '../components/Header';
import Hero from '../components/Hero';
import TrackingAuditor from '../components/TrackingAuditor';
import RoasCalculator from '../components/RoasCalculator';
import ProtocolPipeline from '../components/ProtocolPipeline';
import CaseStudies from '../components/CaseStudies';
import ServicesSection from '../components/ServicesSection';
import PricingGrid from '../components/PricingGrid';
import WorkStrip from '../components/WorkStrip';
import Footer from '../components/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main>
        <Hero />

        <section className="border-t border-slate-800/60 bg-slate-900/20">
          <TrackingAuditor />
        </section>

        <section className="border-t border-slate-800/60">
          <RoasCalculator />
        </section>

        <section className="border-t border-slate-800/60 bg-slate-900/20">
          <ProtocolPipeline />
        </section>

        <section className="border-t border-slate-800/60">
          <CaseStudies />
        </section>

        <section className="border-t border-slate-800/60 bg-slate-900/20">
          <ServicesSection />
        </section>

        <section className="border-t border-slate-800/60 bg-slate-900/20">
          <PricingGrid />
        </section>

        <section className="border-t border-slate-800/60">
          <WorkStrip />
        </section>
      </main>
      <Footer />
    </div>
  );
}
