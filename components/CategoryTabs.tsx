// agent-portal/components/CategoryTabs.tsx
"use client";

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8 p-3 bg-gray-100 rounded-lg shadow-inner border border-gray-200">
      {" "}
      {/* Added shadow-inner */}
      <button
        onClick={() => onSelectCategory("All")}
        className={`py-2 px-6 rounded-full text-base font-medium transition-all duration-200 ease-in-out ${
          activeCategory === "All"
            ? "bg-blue-600 text-white shadow-md"
            : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onSelectCategory(category)}
          className={`py-2 px-6 rounded-full text-base font-medium transition-all duration-200 ease-in-out ${
            activeCategory === category
              ? "bg-blue-600 text-white shadow-md"
              : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
