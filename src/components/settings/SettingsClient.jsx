'use client'

import { useState } from 'react'
import ProductsClient from './ProductsClient'
import CategoriesClient from './CategoriesClient'
import UnitsClient from './UnitsClient'

const tabs = ['Products', 'Categories', 'Units']

export default function SettingsClient({ products, categories, units }) {
  const [activeTab, setActiveTab] = useState('Products')

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'bg-green-600 text-white'
                : 'bg-white text-zinc-500 border'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Products'   && <ProductsClient   products={products}   categories={categories} units={units} />}
      {activeTab === 'Categories' && <CategoriesClient categories={categories} />}
      {activeTab === 'Units'      && <UnitsClient      units={units} />}
    </div>
  )
}