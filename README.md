Whereami? (version 2!)
========


![Whereami version 2!](https://i.imgur.com/ouB3ryy.png)

![Whereami version 2!](https://i.imgur.com/1RlHpxS.png)

![Whereami version 2!](https://i.imgur.com/TfgrDGY.png)

This is a recreation of my original clone of geoguessr I made almost 13 years ago (repo for that is here: https://github.com/webdevbrian/whereami). It's now rebuilt in react and deployed on vercel Check it out here! -> https://whereamiv2.vercel.app/.

# Description
Idea based off of geoguessr. This was a weekend project I did just to come up with a first version. Feel free to pull, and add PRs on bugs you find (I know there are quite a few, which I'll get around to fiddling with on rainy days!).

Also, Please get your own google maps API when you start toying around with it.  ~~Google tracks the amount of API hits ... so please get your own :)~~ You'll now need to add your own API key in your `.env` file for obvious reasons :). Have fun! 🤩

## 🎮 Game Overview

Whereami? is a geography-based guessing game inspired by GeoGuessr. Players are dropped into random locations around the world using Google Street View and must guess where they are by clicking on a map.

### 🎯 How to Play

1. **Start a Game**: Click the start button to begin a new game
2. **Explore**: Use Google Street View to look around your surroundings
3. **Request Clues** (Optional): Use the clue system to get hints about your location
4. **Make Your Guess**: Click on the mini-map to place your guess marker
5. **Submit**: Click the "Make Guess" button to submit your answer
6. **See Results**: View your score and distance from the actual location
7. **Continue**: Play through 5 rounds to complete the game

### ⏱️ Game Mechanics

- **5 Rounds**: Each game consists of 5 rounds
- **45-Second Timer**: Each round has a 45-second time limit
- **Scoring System**: Points are awarded based on distance accuracy:
  - 1-2 km: 10,000 points
  - 3-10 km: 7,000 points
  - 11-50 km: 4,000 points
  - 51-200 km: 3,000 points
  - 201-500 km: 2,000 points
  - 501-800 km: 1,000 points
  - 801-1300 km: 500 points
  - 1301-1600 km: 400 points
  - 1601-2300 km: 300 points
  - 2301-2800 km: 200 points
  - 2801-3200 km: 100 points
  - 3200-4500 km: 50 points
  - 4501-6000 km: 25 points
  - Over 6000 km: 0 points

### 🕵️ Clue System

- **AI-Powered Hints**: Use Google Vision API to analyze Street View images
- **Text Recognition**: Extracts text from signs, buildings, and landmarks
- **Object Detection**: Identifies objects, landmarks, and logos in the scene
- **One Clue Per Round**: Limited to one clue per round to maintain challenge

### 🛠️ Technical Features

- **React 18** with TypeScript for type safety
- **Google Maps API** integration for Street View and mapping
- **Google Vision API** for intelligent clue generation
- **GSAP** for smooth animations and transitions
- **Vite** for fast development and building
- **Responsive Design** that works on desktop and mobile
- **Real-time Timer** with countdown functionality
- **Interactive Mini-Map** for precise location guessing

### 🎨 User Interface

- **Street View Panel**: Full-screen Google Street View for exploration
- **Mini-Map**: Interactive map for placing guesses
- **Score Board**: Real-time score tracking and round information
- **Timer Display**: Countdown timer with visual feedback
- **Modal System**: Clean modals for game start, round end, and game end
- **Clue Panel**: Dedicated panel for displaying AI-generated hints

### 🚀 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/whereamiv2.git
   cd whereamiv2
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   VITE_GOOGLE_VISION_API_KEY=your_google_vision_api_key_here
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

### 🔧 API Requirements

- **Google Maps JavaScript API**: For Street View and mapping functionality
- **Google Vision API**: For AI-powered clue generation
- **Google Maps Geocoding API**: For location validation

### 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

### 🤝 Contributing

Feel free to submit issues and enhancement requests! This is a weekend project, so I'll get to improvements when I can. Known areas for improvement:

- Mobile responsiveness optimization
- Additional clue types
- Sound effects and music
- Leaderboard system
- Custom game modes
- Better error handling

### 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Have fun exploring the world! 🌍**
