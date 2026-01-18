# Q&A Recommendations - XYZ Salon Voice Assistant

This document outlines all recommended question-answer pairs that the digital voice assistant should support. Questions are grouped by intent category with sample phrasings and expected responses.

---

## Intent Categories Overview

| Category | Priority | Payment Required |
|----------|----------|------------------|
| Service Information | High | No |
| Appointment Booking | High | Yes |
| Packages & Memberships | Medium | No (inquiry) |
| Special Offers | Medium | No |
| Stylist Information | Medium | No |
| About/Mission | Low | No |
| Contact/Transfer | High | No |

---

## 1. Service Information Intent

### Sample Questions (Variations)
```
"What services do you offer?"
"What can I get done at your salon?"
"Do you do hair coloring?"
"Do you offer manicures?"
"Can I get a facial?"
"What hair services do you provide?"
"Do you do men's haircuts?"
"Can I get highlights?"
"What about nail services?"
"Do you offer makeup services?"
"What's your specialty?"
"Tell me about your services"
"Do you do keratin treatments?"
"Can you do updos for weddings?"
```

### Expected Responses

**When asked about services generally:**
> "We offer a full range of hair, nail, and skin services. Our hair services include cuts, styling, color, highlights, and treatments. We also provide manicures, pedicures, facials, waxing, and makeup. What type of service are you interested in?"

**When asked about specific hair services:**
> "Yes, we offer complete hair services including women's cuts starting at $45, men's cuts at $30, full color from $80 to $150, highlights, balayage, and keratin treatments. Would you like to book an appointment?"

**When asked about operating hours:**
> "We're open Monday through Friday 9 AM to 8 PM, Saturday 8 AM to 6 PM, and Sunday 10 AM to 5 PM. When would you like to come in?"

---

## 2. Appointment Booking Intent

### Sample Questions (Variations)
```
"I'd like to book an appointment"
"How do I schedule an appointment?"
"How much is a haircut?"
"What's the price for highlights?"
"Can I book an appointment over the phone?"
"I want to make an appointment"
"What's the difference between a classic and gel manicure?"
"Tell me about your pricing"
"Are there any discounts?"
"Can I walk in?"
"Do you take appointments on Sunday?"
"I need an appointment for Saturday"
"Book an appointment"
```

### Expected Responses

**Initial appointment inquiry:**
> "I'd be happy to help you book an appointment! We offer hair, nail, and skin services. What type of service are you interested in?"

**Price inquiry:**
> "Our haircuts range from $25 for children to $45-$65 for women and $30-$40 for men. Color services start at $80 for full color and $90 for highlights. Would you like to book one of these services?"

**Appointment booking flow:**
> "Perfect! I can help you book that appointment right now. What service would you like, and what date works best for you?"

**Collecting payment:**
> "Great! That's a [service name] for [date] at [time] for $[price]. I'll need your name, email, and credit card information to secure your appointment. What name should I put the appointment under?"

---

## 3. Packages & Memberships Intent

### Sample Questions (Variations)
```
"Do you have any packages?"
"Tell me about your packages"
"What package deals do you offer?"
"Do you have a membership program?"
"Tell me about your bridal package"
"What's included in the spa day?"
"How much is a membership?"
"What do I get with membership?"
"Tell me about the monthly membership"
"Do you have gift certificates?"
"What packages are available?"
"I'm getting married, what do you offer?"
```

### Expected Responses

**General package inquiry:**
> "Yes! We offer several packages including our Bridal Package at $450, Spa Day Package at $250, Color & Style Package at $180, and a Monthly Membership for $99 per month. Which one interests you?"

**Specific package inquiry (e.g., Bridal):**
> "Our Bridal Package is $450 and includes a trial session for the bride, wedding day styling, makeup application, one bridesmaid styling, and complimentary champagne. Would you like to book this package?"

**Membership inquiry:**
> "Our Monthly Membership is $99 per month and includes 20% off all services, priority booking, a birthday month bonus service, one free blowout per month, and invitations to exclusive member events. Would you like to sign up or speak with someone about membership?"

---

## 4. Special Offers Intent

### Sample Questions (Variations)
```
"Do you have any specials?"
"Are there any current promotions?"
"Do you offer any discounts?"
"Tell me about your deals"
"What promotions do you have?"
"Do you have a new customer discount?"
"Is there a referral program?"
"Any birthday specials?"
"What's on sale?"
"Do you have seasonal promotions?"
```

### Expected Responses

**General offers inquiry:**
> "Yes! We have several special offers. New clients get 20% off their first visit for services over $50. We also have a referral program where you get $25 off when you refer a friend. Would you like to take advantage of one of these offers?"

**New client special:**
> "Our new client special is 20% off your first visit, which includes a complimentary consultation. This applies to any service over $50. Would you like to book your first appointment?"

**Referral program:**
> "Our referral program gives you $25 off your next service when you refer a friend, and your friend gets 15% off their first visit. There's no limit on referrals! Would you like more information?"

---

## 5. Stylist Information Intent

### Sample Questions (Variations)
```
"Tell me about your stylists"
"Who are your hair stylists?"
"Can I request a specific stylist?"
"What experience do your stylists have?"
"Are your stylists licensed?"
"Do you have color specialists?"
"Who does the best highlights?"
"Can I choose my stylist?"
"Tell me about your team"
"Do you have men's grooming specialists?"
"Who does bridal hair?"
"What certifications do your stylists have?"
```

### Expected Responses

**General stylist inquiry:**
> "All our stylists are licensed and certified with years of experience. We have specialists in color, cutting, styling, and nail services. They receive ongoing education to stay current with the latest techniques and trends. Would you like to request a specific stylist for your appointment?"

**Specialist inquiry:**
> "Yes! We have hair color specialists with advanced certification in balayage and ombre, as well as cutting specialists who are experts in both classic and modern styles. We also have curly hair specialists and men's grooming experts. What service are you interested in?"

**Stylist selection:**
> "You can absolutely request a specific stylist when you book! You can choose your preferred stylist or select 'first available.' Building a relationship with a stylist helps ensure consistent results. Would you like to book with a specific stylist or our first available?"

**Team qualifications:**
> "Our entire team maintains professional licenses and certifications. They participate in continuous education and training, and many have specialized certifications in areas like advanced color techniques, precision cutting, and nail artistry."

---

## 6. About/Mission Intent

### Sample Questions (Variations)
```
"What is XYZ Salon?"
"Tell me about your salon"
"How long have you been in business?"
"What makes you different?"
"What's your mission?"
"Why should I choose your salon?"
"What products do you use?"
"Are you eco-friendly?"
```

### Expected Responses

**About the salon:**
> "XYZ Salon is a full-service beauty salon dedicated to providing exceptional hair, nail, and skin services in a welcoming, professional environment. We believe everyone deserves to look and feel their best."

**Why choose us:**
> "We're committed to client-focused service using only professional-grade products. Our experienced team stays current with the latest techniques and trends through continuous education. We focus on creating lasting relationships with our clients and exceeding expectations with every visit."

---

## 7. Contact/Transfer Intent

### Sample Questions (Variations)
```
"I'd like to speak to someone"
"Can I talk to a person?"
"Transfer me to a human"
"I need help"
"This isn't helping"
"Get me a real person"
"Let me talk to someone"
"How can I contact you?"
"What's your phone number?"
"Leave a message"
"I want to leave a voicemail"
```

### Expected Responses

**Transfer request:**
> "I'll transfer you to a team member right now. Please hold."

**Contact info request:**
> "You can reach us through our website at xyzsalon.com/contact. We respond to all inquiries within 24 hours. Would you like me to transfer you to someone now, or would you prefer to leave a message?"

**Voicemail:**
> "I'll take a message for our team. Please state your name, phone number, and your message after the beep. Press pound when finished."

---

## 8. Logistics/Practical Questions

### Sample Questions (Variations)
```
"Is parking free?"
"Where do I park?"
"Is the salon wheelchair accessible?"
"What should I bring to my appointment?"
"How long will my appointment take?"
"Do you take walk-ins?"
"Do you take cash?"
"Can I bring my kids?"
"What if I need to cancel?"
"Do you sell hair products?"
```

### Expected Responses

**Parking:**
> "Yes, we have ample free parking available for all our clients right at our salon location."

**What to bring:**
> "Just bring yourself! We provide everything needed for your service. If you have inspiration photos for your hair or nails, feel free to bring them for your consultation."

**Service duration:**
> "Service times vary depending on what you're getting done. A simple haircut takes 30 to 45 minutes, while color services can take 2 to 3 hours. We'll let you know the expected time when you book your appointment."

**Payment:**
> "We accept all major credit cards, cash, and digital payments. Gratuity is not included in service prices but is always appreciated for excellent service."

---

## 9. Edge Cases & Fallbacks

### Unclear Intent
```
"I have a question"
"Can you help me?"
"Hello?"
"What?"
```

**Response:**
> "I'd be happy to help! I can tell you about our services and pricing, help you book an appointment, provide information about packages and memberships, or share details about our stylists. What would you like to know?"

### Out of Scope Questions
```
"What's the weather?"
"Can you order me a pizza?"
"Tell me a joke"
```

**Response:**
> "I'm the XYZ Salon assistant, so I can best help with questions about our services, appointments, pricing, packages, or special offers. Is there anything about XYZ Salon I can help you with?"

### Complaints/Issues
```
"I have a complaint"
"I need to cancel my appointment"
"I need a refund"
"There was a problem with my service"
```

**Response:**
> "I'm sorry to hear you're having an issue. Let me transfer you to a team member who can help resolve this for you. Please hold."

---

## 10. Confirmation & Closing

### After Appointment Booking
> "Your appointment is confirmed! You'll receive a confirmation email shortly with your appointment details. Your confirmation number is [CODE]. Is there anything else I can help you with?"

### After Information Query
> "Is there anything else you'd like to know about XYZ Salon?"

### Closing
> "Thank you for calling XYZ Salon! We look forward to seeing you soon. Goodbye!"

---

## Voice Response Best Practices

### Do:
- Keep responses concise (aim for under 30 seconds of speech)
- Offer next steps or follow-up options
- Confirm understanding before processing payments
- Use natural, conversational language
- Spell out URLs when needed ("x y z salon dot com")

### Don't:
- Read long lists verbatim
- Use technical jargon
- Make promises you can't keep
- Skip payment confirmations
- Hang up abruptly

### Confirm Before Actions:
- "Just to confirm, you'd like a haircut and highlights appointment on Saturday at 2 PM for a total of $155. Is that correct?"
- "I'm going to process your payment now. The charge will appear as 'XYZ Salon' on your statement."

---

## Recommended IVR Menu Structure

```
Welcome: "Thank you for calling XYZ Salon! This call may be recorded."

Main Menu:
  Press 1: Service Information & Pricing
  Press 2: Book an Appointment
  Press 3: Packages & Memberships
  Press 4: Speak with Someone
  Press 9: Voice Assistant (AI conversation)

Or say what you need and I'll help you.
```

---

## Metrics to Track

1. **Call Volume**: Total calls per day/week
2. **Intent Distribution**: Which categories get most questions
3. **Resolution Rate**: % of calls resolved without transfer
4. **Appointment Conversion**: % of calls that result in bookings
5. **Average Handle Time**: Duration of calls
6. **Membership Leads**: Number of membership inquiries captured
7. **Transfer Rate**: % of calls transferred to human
8. **Voicemail Rate**: % of calls going to voicemail
9. **Repeat Callers**: Returning caller identification
10. **Customer Satisfaction**: Post-call ratings (if implemented)
