'use client'

import { useState } from 'react'
import type { MediaKitConfig } from '@/types/media-kit'

interface InquiryFormProps {
  config: MediaKitConfig
}

export function InquiryForm({ config }: InquiryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    opportunityType: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/media-kit-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setSubmitted(true)
        setFormData({ name: '', email: '', opportunityType: '', message: '' })
      }
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  if (submitted) {
    return (
      <div className="form-success">
        <h3>Thank you for your inquiry</h3>
        <p>I'll be in touch within 48 hours.</p>
      </div>
    )
  }

  return (
    <form className="inquiry-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="opportunityType">Type of Opportunity</label>
        <select
          id="opportunityType"
          name="opportunityType"
          value={formData.opportunityType}
          onChange={handleChange}
          required
        >
          <option value="">Select an option</option>
          {config.form.opportunityTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          name="message"
          rows={5}
          value={formData.message}
          onChange={handleChange}
        />
      </div>
      <button type="submit" className="form-submit">Send Inquiry</button>
    </form>
  )
}
