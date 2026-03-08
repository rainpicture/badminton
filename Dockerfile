# สเตปที่ 1: สร้างสภาพแวดล้อม Node.js เพื่อ Build โปรเจกต์ Vite ของคุณ
FROM node:20-alpine AS builder
WORKDIR /app

# คัดลอกไฟล์จัดการ package มาก่อนเพื่อติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# คัดลอกไฟล์ทั้งหมดในโปรเจกต์ (ตามโครงสร้างเดิม) และทำการ Build
COPY . .
RUN npm run build

# สเตปที่ 2: นำไฟล์ที่ Build เสร็จแล้วมาใส่ใน Nginx เพื่อเตรียมให้บริการ
FROM nginx:alpine

# นำไฟล์ที่ Build ได้จากโฟลเดอร์ dist มาไว้ในโฟลเดอร์ที่ Nginx ใช้แสดงผล
COPY --from=builder /app/dist /usr/share/nginx/html

# นำไฟล์ตั้งค่า nginx.conf ที่เราสร้างไว้ ไปทับการตั้งค่าเริ่มต้นของ Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
