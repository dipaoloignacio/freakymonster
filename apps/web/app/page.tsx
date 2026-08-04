import Grain from "@/components/Grain";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Gallery from "@/components/Gallery";
import Artists from "@/components/Artists";
import Styles from "@/components/Styles";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="relative w-full overflow-hidden bg-ink text-bone">
      <Grain />
      <Navbar />
      <Hero />
      <Gallery />
      <About />
      <Artists />
      <Styles />
      <Testimonials />
      <Footer />
    </div>
  );
}
