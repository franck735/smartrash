import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Recycle, 
  MapPin, 
  Truck, 
  Phone, 
  Mail, 
  Star, 
  CheckCircle2,
  Leaf,
  Clock,
  Shield
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/ImyandaSmart-01.png" 
              alt="ImyandaSmart" 
              className="h-10 w-auto"
            />
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-green-600 transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-green-600 transition-colors font-medium">How It Works</a>
            <a href="#testimonials" className="text-gray-600 hover:text-green-600 transition-colors font-medium">Testimonials</a>
            <a href="#contact" className="text-gray-600 hover:text-green-600 transition-colors font-medium">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="text-gray-700 hover:text-green-600 hover:bg-green-50">
                Sign In
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-green-600 hover:bg-green-700 text-white px-6">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-green-600/5 rotate-12 transform translate-x-20"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-emerald-600/5 -rotate-12 transform -translate-x-20"></div>
        
        <div className="container mx-auto relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-6">
              <Leaf className="h-4 w-4" />
              <span className="text-sm font-medium">Rwanda's Premier Waste Management Solution</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Smart Waste Management for a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600">
                Cleaner Rwanda
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              ImyandaSmart brings modern, efficient garbage collection right to your doorstep. 
              Schedule pickups, track service history, and contribute to a cleaner, greener Rwanda.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-10 py-6 h-auto shadow-lg shadow-green-600/25">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg px-10 py-6 h-auto border-gray-300 hover:bg-green-50 hover:border-green-300">
                  Sign In
                </Button>
              </Link>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Free setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Image/Illustration */}
        <div className="container mx-auto mt-16 px-4">
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 md:p-12">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Recycle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">ImyandaSmart</h3>
                    <p className="text-gray-400 text-sm">Mobile App</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Next Pickup</p>
                  <p className="text-white font-semibold">Tomorrow, 8:00 AM</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <Truck className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">Status</p>
                  <p className="text-green-400 font-semibold">On Route</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <MapPin className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">Driver</p>
                  <p className="text-white font-semibold">2 km away</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                  <Clock className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-xs">ETA</p>
                  <p className="text-white font-semibold">~15 min</p>
                </div>
              </div>

              <div className="bg-green-600 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Your bin is ready!</p>
                  <p className="text-white font-semibold">Mark as ready for pickup</p>
                </div>
                <Button className="bg-white text-green-600 hover:bg-green-50">
                  Ready
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose ImyandaSmart?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We combine technology with local expertise to provide the best waste management experience in Rwanda.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 p-5 w-fit mb-5">
                  <Truck className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Reliable Pickups</h3>
                <p className="text-gray-600 leading-relaxed">
                  Schedule regular garbage collection that you can count on. Our automated system ensures never miss a pickup again.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 p-5 w-fit mb-5">
                  <MapPin className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Real-time Tracking</h3>
                <p className="text-gray-600 leading-relaxed">
                  Track your pickup status in real-time with our mobile app. Know exactly when your trash will be collected.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-5 w-fit mb-5">
                  <Recycle className="h-10 w-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Eco-Friendly</h3>
                <p className="text-gray-600 leading-relaxed">
                  Join thousands of Rwandans in keeping our communities clean and environmentally sustainable for future generations.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 px-6 flex items-start gap-4">
                <div className="rounded-full bg-orange-100 p-3">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Secure Payments</h4>
                  <p className="text-gray-600">Mobile money integration with MTN and Airtel for convenient, cashless payments.</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 px-6 flex items-start gap-4">
                <div className="rounded-full bg-teal-100 p-3">
                  <Clock className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Flexible Scheduling</h4>
                  <p className="text-gray-600">Choose from daily, twice-weekly, or thrice-weekly pickup plans that fit your needs.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">
              Get started in just a few simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Sign Up", desc: "Create your free account in seconds", icon: "👤" },
              { step: "2", title: "Choose Plan", desc: "Select a pickup schedule that works for you", icon: "📋" },
              { step: "3", title: "Mark Ready", desc: "Tap when your bin is ready for collection", icon: "✋" },
              { step: "4", title: "Get Collected", desc: "We handle the rest - it's that simple!", icon: "🚛" },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-green-600/30">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-green-300 to-transparent"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">
              Join thousands of satisfied customers across Rwanda
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8 px-8 pb-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "ImyandaSmart has completely transformed how I manage household waste. The app is intuitive and the pickup service is always on time. I recommend it to everyone in my neighborhood!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-600 font-bold">J</span>
                  </div>
                  <div>
                    <p className="font-semibold">Jeanette U.</p>
                    <p className="text-sm text-gray-500">Kigali, Rwanda</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-8 px-8 pb-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  "As a business owner, reliable waste management is crucial. ImyandaSmart provides excellent commercial collection services. Their customer support is also very responsive."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">E</span>
                  </div>
                  <div>
                    <p className="font-semibold">Emmanuel R.</p>
                    <p className="text-sm text-gray-500">Gasabo, Rwanda</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 bg-green-600">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">10K+</p>
              <p className="text-green-100">Active Users</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">50K+</p>
              <p className="text-green-100">Pickups Monthly</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">99%</p>
              <p className="text-green-100">On-Time Rate</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-bold text-white mb-2">5★</p>
              <p className="text-green-100">App Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-10">
            Join thousands of satisfied customers across Rwanda. Sign up today and get your first pickup scheduled!
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg px-12 py-6 h-auto shadow-lg shadow-green-600/25">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-5 gap-10">
            <div className="md:col-span-2">
              <img 
                src="/ImyandaSmart-01.png" 
                alt="ImyandaSmart" 
                className="h-12 w-auto mb-4"
              />
              <p className="text-gray-400 mb-6 max-w-sm">
                Smart waste management solutions for Rwanda. Building a cleaner, greener future together.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-600 transition-colors">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-600 transition-colors">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-600 transition-colors">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-lg">Services</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-green-400 transition-colors">Residential Pickup</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Commercial Collection</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Recycling Programs</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Special Events</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-lg">Company</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-green-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Press</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-lg">Contact</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-green-500" /> 
                  +250 788 000 000
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-green-500" /> 
                  info@imyandasmart.rw
                </li>
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-green-500 mt-0.5" /> 
                  Kigali, Rwanda
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400">© 2026 ImyandaSmart. All rights reserved.</p>
              <div className="flex gap-6 text-gray-400 text-sm">
                <a href="#" className="hover:text-green-400 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-green-400 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-green-400 transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
