export interface CountryData {
  code: string;
  name: string;
  cities: string[];
}

export const COUNTRIES: CountryData[] = [
  { code: "US", name: "United States", cities: ["New York", "Los Angeles", "Chicago"] },
  { code: "CA", name: "Canada", cities: ["Toronto", "Vancouver", "Montreal"] },
  { code: "MX", name: "Mexico", cities: ["Mexico City", "Guadalajara", "Monterrey"] },
  { code: "BR", name: "Brazil", cities: ["São Paulo", "Rio de Janeiro", "Brasília"] },
  { code: "AR", name: "Argentina", cities: ["Buenos Aires", "Córdoba", "Rosario"] },
  { code: "CO", name: "Colombia", cities: ["Bogotá", "Medellín", "Cali"] },
  { code: "CL", name: "Chile", cities: ["Santiago", "Valparaíso", "Concepción"] },
  { code: "PE", name: "Peru", cities: ["Lima", "Arequipa", "Trujillo"] },
  { code: "GB", name: "United Kingdom", cities: ["London", "Manchester", "Birmingham"] },
  { code: "DE", name: "Germany", cities: ["Berlin", "Munich", "Hamburg"] },
  { code: "FR", name: "France", cities: ["Paris", "Marseille", "Lyon"] },
  { code: "IT", name: "Italy", cities: ["Rome", "Milan", "Naples"] },
  { code: "ES", name: "Spain", cities: ["Madrid", "Barcelona", "Valencia"] },
  { code: "NL", name: "Netherlands", cities: ["Amsterdam", "Rotterdam", "The Hague"] },
  { code: "BE", name: "Belgium", cities: ["Brussels", "Antwerp", "Ghent"] },
  { code: "CH", name: "Switzerland", cities: ["Zurich", "Geneva", "Basel"] },
  { code: "AT", name: "Austria", cities: ["Vienna", "Graz", "Linz"] },
  { code: "PL", name: "Poland", cities: ["Warsaw", "Kraków", "Wrocław"] },
  { code: "SE", name: "Sweden", cities: ["Stockholm", "Gothenburg", "Malmö"] },
  { code: "NO", name: "Norway", cities: ["Oslo", "Bergen", "Trondheim"] },
  { code: "DK", name: "Denmark", cities: ["Copenhagen", "Aarhus", "Odense"] },
  { code: "FI", name: "Finland", cities: ["Helsinki", "Espoo", "Tampere"] },
  { code: "PT", name: "Portugal", cities: ["Lisbon", "Porto", "Braga"] },
  { code: "IE", name: "Ireland", cities: ["Dublin", "Cork", "Galway"] },
  { code: "CZ", name: "Czech Republic", cities: ["Prague", "Brno", "Ostrava"] },
  { code: "RO", name: "Romania", cities: ["Bucharest", "Cluj-Napoca", "Timișoara"] },
  { code: "GR", name: "Greece", cities: ["Athens", "Thessaloniki", "Patras"] },
  { code: "TR", name: "Turkey", cities: ["Istanbul", "Ankara", "Izmir"] },
  { code: "RU", name: "Russia", cities: ["Moscow", "Saint Petersburg", "Novosibirsk"] },
  { code: "UA", name: "Ukraine", cities: ["Kyiv", "Kharkiv", "Odesa"] },
  { code: "CN", name: "China", cities: ["Shanghai", "Beijing", "Shenzhen"] },
  { code: "JP", name: "Japan", cities: ["Tokyo", "Osaka", "Yokohama"] },
  { code: "KR", name: "South Korea", cities: ["Seoul", "Busan", "Incheon"] },
  { code: "IN", name: "India", cities: ["Mumbai", "Delhi", "Bangalore"] },
  { code: "AU", name: "Australia", cities: ["Sydney", "Melbourne", "Brisbane"] },
  { code: "NZ", name: "New Zealand", cities: ["Auckland", "Wellington", "Christchurch"] },
  { code: "ZA", name: "South Africa", cities: ["Johannesburg", "Cape Town", "Durban"] },
  { code: "NG", name: "Nigeria", cities: ["Lagos", "Abuja", "Kano"] },
  { code: "EG", name: "Egypt", cities: ["Cairo", "Alexandria", "Giza"] },
  { code: "KE", name: "Kenya", cities: ["Nairobi", "Mombasa", "Kisumu"] },
  { code: "AE", name: "United Arab Emirates", cities: ["Dubai", "Abu Dhabi", "Sharjah"] },
  { code: "SA", name: "Saudi Arabia", cities: ["Riyadh", "Jeddah", "Mecca"] },
  { code: "IL", name: "Israel", cities: ["Tel Aviv", "Jerusalem", "Haifa"] },
  { code: "SG", name: "Singapore", cities: ["Singapore", "Jurong East", "Tampines"] },
  { code: "MY", name: "Malaysia", cities: ["Kuala Lumpur", "George Town", "Johor Bahru"] },
  { code: "TH", name: "Thailand", cities: ["Bangkok", "Chiang Mai", "Phuket"] },
  { code: "ID", name: "Indonesia", cities: ["Jakarta", "Surabaya", "Bandung"] },
  { code: "PH", name: "Philippines", cities: ["Manila", "Cebu", "Davao"] },
  { code: "VN", name: "Vietnam", cities: ["Ho Chi Minh City", "Hanoi", "Da Nang"] },
];

export function getCitiesForCountry(countryName: string): string[] {
  const country = COUNTRIES.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase() || c.code.toLowerCase() === countryName.toLowerCase()
  );
  return country?.cities ?? [];
}
