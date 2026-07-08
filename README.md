# Picker Pro

A comprehensive OCR-based product picker and data processing application built with Next.js and React.

## Features

- **OCR Processing**: Extract text from images and documents
- **Data Parsing**: Parse and structure extracted data
- **Calculations**: Perform computations on extracted data
- **Data Export**: Export results in multiple formats
- **Database Integration**: Store and retrieve processed data
- **Responsive UI**: Modern component-based interface

## Project Structure

```
picker-pro/
├── app/                 # Next.js application routes
│   ├── upload/         # Upload functionality
│   ├── results/        # Results display
│   ├── settings/       # Application settings
│   └── api/            # API routes
├── components/         # Reusable React components
│   ├── UploadBox       # File upload component
│   ├── ResultsTable    # Results display table
│   ├── SummaryCards    # Summary statistics cards
│   └── ProgressBar     # Progress indicator
├── lib/                # Utility libraries
│   ├── ocr/           # OCR processing logic
│   ├── parser/        # Data parsing utilities
│   ├── calculator/    # Calculation engines
│   ├── export/        # Export handlers
│   └── database/      # Database utilities
├── data/              # Static data
│   └── products/      # Product data
├── public/            # Static assets
└── [config files]     # Configuration files
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/audis320vt1998-sketch/picker-pro.git
cd picker-pro

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Environment Variables

See `.env.example` for required environment variables.

## License

MIT

## Author

[audis320vt1998-sketch](https://github.com/audis320vt1998-sketch)