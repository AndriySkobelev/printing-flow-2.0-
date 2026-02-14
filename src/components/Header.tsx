import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { Tabs, TabsList } from './ui/tabs'

const pages = [
  {
    to: '/',
    label: 'Home',
  },
  {
    to: '/storeMovements',
    label: 'Store Movements',
  },
  {
    to: '/products',
    label: 'Products',
  },
]

export default function Header() {
  const location = useLocation()
  console.log("🚀 ~ Header ~ location:", location)
  return (
    <div className="flex text-white justify-center px-4">
      <Tabs className="py-4 px-8">
        <TabsList className='px-4'>
          {pages.map((page) => (
            <Link
              key={page.to}
              to={page.to}
              className="flex items-center px-3 h-5 rounded-md text-sm font-medium"
              style={{
                background: location.pathname === page.to ? '#084b61' : 'transparent',
                color: location.pathname === page.to ? 'white' : '#084b61',
              }}
            >
              {page.label}
            </Link>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
