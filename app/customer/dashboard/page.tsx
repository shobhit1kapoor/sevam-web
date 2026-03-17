import Image from "next/image";

const services = [
  { name: "Electrician", icon: "/homepage/services/electrician.png" },
  { name: "Makeup & Styling", icon: "/homepage/services/makeup.png" },
  { name: "Home Cleaning", icon: "/homepage/services/broom.png" },
  { name: "Massage & Spa", icon: "/homepage/services/spa.png" },
  { name: "Yoga & Wellness", icon: "/homepage/services/yoga.png" },
  { name: "AC & Appliance", icon: "/homepage/services/ac.png" },
  { name: "At-Home Cook", icon: "/homepage/services/cook.png" },
  { name: "Laundry & Ironing", icon: "/homepage/services/laundry.png" },
];

const subBanners = [
  "/homepage/subbanner1.png",
  "/homepage/subbanner2.png",
  "/homepage/subbanner3.png",
];

export default function Dashboard() {
  return (
    <div className="bg-[#f6f6f6] min-h-screen">

      {/* ---------------- NAVBAR (FULL WIDTH) ---------------- */}

      <header className="bg-white border-b">

        <div className="flex items-center justify-between px-8 py-4">

          {/* LEFT */}
          <div className="flex items-center gap-6">

            <div className="text-xl font-semibold text-gray-900">
              Sevam
            </div>

            <div className="text-sm leading-tight">
              <div className="font-semibold text-gray-800">
                Service in 60 minutes
              </div>

              <div className="text-gray-500 text-xs">
                📍 A-Block, Janakpuri, Delhi
              </div>
            </div>

          </div>

          {/* SEARCH BAR */}

          <div className="flex-1 max-w-[500px] mx-10">

            <input
              className="w-full border rounded-lg px-4 py-2 text-sm bg-gray-50"
              placeholder="Search for plumbing, salon, cleaners..."
            />

          </div>

          {/* RIGHT BUTTONS */}

          <div className="flex items-center gap-3">

            <button className="px-4 py-2 border rounded-lg text-sm">
              Login
            </button>

            <button className="px-4 py-2 bg-blue-900 text-white rounded-lg text-sm">
              My Booking
            </button>

          </div>

        </div>

      </header>


      {/* ---------------- MAIN CONTENT ---------------- */}

      <main className="max-w-[1200px] mx-auto px-6">


        {/* HERO BANNER */}

        <section className="mt-6">

          <div className="rounded-xl overflow-hidden">

            <Image
              src="/homepage/banner.png"
              alt="hero"
              width={1200}
              height={350}
              className="w-full h-auto object-contain"
              priority
            />

          </div>

        </section>


        {/* SUB BANNERS */}

        <section className="mt-6 grid grid-cols-3 gap-6">

          {subBanners.map((banner, i) => (
            <Image
              key={i}
              src={banner}
              alt="banner"
              width={380}
              height={150}
              className="rounded-xl w-full h-auto"
            />
          ))}

        </section>


        {/* SERVICES */}

        <section className="mt-8">

          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Our Services:
          </h2>

          <div className="grid grid-cols-8 gap-6 text-center">

            {services.map((service, i) => (
              <div key={i}>

                <div className="relative w-16 h-16 mx-auto mb-2">

                  <Image
                    src={service.icon}
                    alt={service.name}
                    fill
                    className="object-contain"
                  />

                </div>

                <p className="text-sm text-gray-800">
                  {service.name}
                </p>

              </div>
            ))}

          </div>

        </section>


        {/* MOST BOOKED */}

        <section className="mt-10">

          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            Most booked services
          </h2>

          <div className="grid grid-cols-5 gap-4">

            {[1,2,3,4,5].map((i)=>(
              <div
                key={i}
                className="h-[160px] bg-gray-200 rounded-lg flex items-center justify-center"
              >
                Service {i}
              </div>
            ))}

          </div>

        </section>

      </main>


      {/* ---------------- FOOTER ---------------- */}

      <footer className="bg-gray-100 mt-16">

        <div className="max-w-[1200px] mx-auto px-6 py-12">

          <div className="text-xl font-semibold mb-8">
            Sevam
          </div>

          <div className="grid grid-cols-4 gap-12">

            <div>
              <h3 className="font-semibold mb-3">Company</h3>

              <ul className="space-y-2 text-sm text-gray-600">
                <li>About us</li>
                <li>Investor Relations</li>
                <li>Terms & conditions</li>
                <li>Privacy policy</li>
                <li>Careers</li>
              </ul>
            </div>


            <div>
              <h3 className="font-semibold mb-3">For customers</h3>

              <ul className="space-y-2 text-sm text-gray-600">
                <li>UC reviews</li>
                <li>Categories near you</li>
                <li>Contact us</li>
              </ul>
            </div>


            <div>
              <h3 className="font-semibold mb-3">For professionals</h3>

              <ul className="space-y-2 text-sm text-gray-600">
                <li>Register as a professional</li>
              </ul>
            </div>


            <div>
              <h3 className="font-semibold mb-3">Social links</h3>

              <div className="flex gap-4 text-gray-600 mb-4">
                <span>Twitter</span>
                <span>Facebook</span>
                <span>Instagram</span>
              </div>

            </div>

          </div>

        </div>

      </footer>

    </div>
  );
}