FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# use npm install to handle missing lockfile in the scaffold
RUN npm install --silent
COPY . .
RUN npm run build
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "start"]
