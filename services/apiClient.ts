const API_URL = 'https://api.aimleague.es';    
//const API_URL = 'http://maikroweif-001-site1.qtempurl.com';    //CORS POLICY 

/*export const apiClient = async (
  endpoint: string,
  options: RequestInit = {}
) => {
    const fullUrl = `${API_URL}${endpoint}`;
    const authToken = localStorage.getItem('token');
  
    const isFormData = options.body instanceof FormData;
  
    const headers: HeadersInit = {
      Authorization: `Bearer ${authToken}`,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };
  
    console.log('➡️ API Request:', {
      url: fullUrl,
      method: options.method || 'GET',
      headers,
      body: isFormData
        ? '[FormData]'
        : options.body
        ? JSON.parse(options.body.toString())
        : undefined,
    });

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  console.log('Response text:', text);

  if (!response.ok) {
    let errorMessage = 'API Error';
    try {
      if (text) {
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || text;
      }
    } catch {
      errorMessage = text || 'Unknown error occurred';
    }
    throw new Error(errorMessage);
  }

  return text ? JSON.parse(text) : {};
};*/

export const apiClient = async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const fullUrl = `${API_URL}${endpoint}`;
    const authToken = localStorage.getItem('token');
  
    const isFormData = options.body instanceof FormData;
  
    const headers: HeadersInit = {
      Authorization: `Bearer ${authToken}`,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };
  
    console.log('➡️ API Request:', {
      url: fullUrl,
      method: options.method || 'GET',
      headers,
      body: isFormData
        ? '[FormData]'
        : options.body
        ? JSON.parse(options.body.toString())
        : undefined,
    });
  
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  
    const text = await response.text();
    console.log('Response text:', text);
  
    if (!response.ok) {
  
      let errorMessage = 'API Error';
      try {
        if (text) {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || text;
        }
      } catch {
        errorMessage = text || 'Unknown error occurred';
      }
      throw new Error(errorMessage);
    }
  
    return text ? JSON.parse(text) : {};
  };
  
  export const apiAnonymousClient = async (
    endpoint: string,
    options: RequestInit = {}
  ) => {
    const fullUrl = `${API_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
  
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };
  
    console.log('➡️ Anonymous API Request:', {
      url: fullUrl,
      method: options.method || 'GET',
      headers,
      body: isFormData
        ? '[FormData]'
        : options.body
        ? JSON.parse(options.body.toString())
        : undefined,
    });
  
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  
    const text = await response.text();
    console.log('Response text:', text);
  
    if (!response.ok) {
      let errorMessage = 'API Error';
      try {
        if (text) {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || text;
        }
      } catch {
        errorMessage = text || 'Unknown error occurred';
      }
      throw new Error(errorMessage);
    }
  
    return text ? JSON.parse(text) : {};
  };
  
