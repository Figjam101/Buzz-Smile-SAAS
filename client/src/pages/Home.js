import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BouncingBall from '../components/BouncingBall';
import GSAPTextAnimation from '../components/GSAPTextAnimation';
import { 
  Play, 
  Upload, 
  Edit3, 
  Share2, 
  Zap, 
  Shield, 
  Users, 
  ArrowRight,
  CheckCircle
} from 'lucide-react';

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Upload,
      title: 'Easy Upload',
      description: 'Drag and drop your videos or browse to upload. Support for all major video formats.'
    },
    {
      icon: Edit3,
      title: 'Professional Editing',
      description: 'Powerful editing tools with trim, cut, merge, and effects to create stunning videos.'
    },
    {
      icon: Share2,
      title: 'Instant Sharing',
      description: 'Share your videos instantly with custom links or export in multiple formats.'
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Cloud-powered processing ensures your videos are ready in seconds, not minutes.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your videos are encrypted and stored securely. You control who sees what.'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Work together with your team on video projects with real-time collaboration.'
    }
  ];

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for getting started',
      features: [
        '5 video uploads per month',
        'Basic editing tools',
        '720p export quality',
        '1GB storage',
        'Community support'
      ],
      cta: 'Get Started Free',
      popular: false
    },
    {
      name: 'Pro',
      price: '$19',
      period: '/month',
      description: 'For content creators and small teams',
      features: [
        '50 video uploads per month',
        'Advanced editing tools',
        '4K export quality',
        '100GB storage',
        'Priority support',
        'Custom branding'
      ],
      cta: 'Start Pro Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: '/month',
      description: 'For large teams and organizations',
      features: [
        'Unlimited video uploads',
        'All editing features',
        '8K export quality',
        '1TB storage',
        '24/7 dedicated support',
        'Advanced analytics',
        'API access'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen">
      
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-blue-100 py-12 sm:py-20 relative min-h-screen flex items-center">
        <BouncingBall />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="text-center space-y-6 sm:space-y-8">
            <GSAPTextAnimation 
              animationType="fadeInUp" 
              delay={0.2} 
              duration={1.2}
              className="text-3xl sm:text-4xl md:text-6xl font-bold text-gray-900 tracking-tight leading-tight"
            >
              Create Amazing Videos
              <span className="text-primary-600 block mt-2">In Minutes, Not Hours</span>
            </GSAPTextAnimation>
            <GSAPTextAnimation 
              animationType="fadeInUp" 
              delay={0.6} 
              duration={1}
              className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
            >
              Professional video editing made simple. Upload, edit, and share stunning videos 
              with our powerful cloud-based platform. No software installation required.
            </GSAPTextAnimation>
            <GSAPTextAnimation 
              animationType="scaleIn" 
              delay={1} 
              duration={0.8}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center pt-2"
            >
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 inline-flex items-center justify-center space-x-2 w-full sm:w-auto max-w-xs sm:max-w-none"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 inline-flex items-center justify-center space-x-2 w-full sm:w-auto max-w-xs sm:max-w-none"
                  >
                    <span>Start Creating Free</span>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="btn-outline text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 inline-flex items-center justify-center space-x-2 w-full sm:w-auto max-w-xs sm:max-w-none"
                  >
                    <Play className="h-5 w-5" />
                    <span>Watch Demo</span>
                  </Link>
                </>
              )}
            </GSAPTextAnimation>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Create
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to help you create professional videos 
              without the complexity of traditional editing software.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 hover:shadow-lg transition-shadow border border-gray-300 shadow-md hover:shadow-xl">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg border-2 border-black">
                    <feature.icon className="h-6 w-6 text-gray-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose the plan that fits your needs. Upgrade or downgrade at any time.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index} 
                className={`card p-8 relative flex flex-col h-full ${
                  plan.popular 
                    ? 'border-primary-600 shadow-lg scale-105' 
                    : 'border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gray-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-1">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    {plan.description}
                  </p>
                </div>
                
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="flex justify-center mt-auto">
                  <Link
                    to={isAuthenticated ? "/dashboard" : "/register"}
                    className={`w-full text-center py-3 px-4 rounded-full font-medium transition-colors inline-block ${
                      plan.popular
                        ? 'bg-gray-600 text-white hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Credit */}
      <footer className="py-4 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-gray-500">
            Web App Powered By{' '}
            <a 
              href="http://www.belgraviasolutions.com.au" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-800 underline"
            >
              Belgravia Solutions
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
};

export default Home;