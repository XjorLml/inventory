'use client'

import { useState } from 'react'
import { Bug } from 'lucide-react'
import ProductsClient from './ProductsClient'
import CategoriesClient from './CategoriesClient'
import UnitsClient from './UnitsClient'
import ReportBugForm from '@/components/qa/ReportBugForm'

const tabs = ['Products', 'Categories', 'Units', 'QA']

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
      {activeTab === 'QA' && (
        <div>
          <div className="bg-white border rounded-xl p-4 mb-4 flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <Bug className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">Found something broken?</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                File a bug report — it goes straight to GitHub Issues with automatic dedup.
              </p>
            </div>
          </div>

          <ReportBugForm />
        </div>
      )}
    </div>
  )
}