import { useNavigate } from "react-router-dom";

function HomePage() {
  return (
    <div>
      <div className="py-20 bg-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Your data, your insights
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            A website dedicated to delivering you an inside look at your listening habits.
          </p>
          <div className="flex justify-center space-x-4">
            <a
              href="insights"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Upload data
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
