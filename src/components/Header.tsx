import { Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { Tabs, TabsList } from './ui/tabs'

const pages = [
  // {
  //   to: '/',
  //   label: 'Home',
  // },
  {
    to: '/inventory-movement',
    label: 'Рух матеріалів',
  },
  {
    to: '/products',
    label: 'Товари',
  },
  {
    to: '/specifications',
    label: 'Специфікації',
  },
]

export default function Header() {
  const location = useLocation()
  return (
    <div className="flex text-white justify-center px-4">
      <Tabs className="py-4 px-8">
        <TabsList className='px-4 bg-primary/10'>
          {pages.map((page) => (
            <Link
              key={page.to}
              to={page.to}
              className={`flex items-center px-3 h-5 rounded-md text-sm font-medium ${location.pathname === page.to ? 'bg-primary text-white' : 'text-primary'}`}
            >
              {page.label}
            </Link>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
