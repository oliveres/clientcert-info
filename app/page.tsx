'use client';

import { useEffect, useState } from 'react';

interface CertificateInfo {
  subject: {
    CN?: string;
    O?: string;
    OU?: string;
    C?: string;
    ST?: string;
    L?: string;
    emailAddress?: string;
  };
  issuer: {
    CN?: string;
    O?: string;
    OU?: string;
    C?: string;
    ST?: string;
    L?: string;
  };
  valid_from: string;
  valid_to: string;
  serialNumber: string;
  fingerprint: string;
  fingerprint256: string;
  subjectaltname?: string;
  ext_key_usage?: string[];
  raw?: string;
}

interface CertificateResponse {
  status: 'missing' | 'invalid' | 'valid' | 'error';
  certificate?: CertificateInfo;
  authorizationError?: string;
  error?: string;
}

interface ValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
  details?: string;
  caFile?: string;
}

export default function Home() {
  const [response, setResponse] = useState<CertificateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationStatus, setValidationStatus] = useState<'none' | 'pending' | 'completed'>('none');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [uploadedCAs, setUploadedCAs] = useState<{name: string; content: string}[]>([]);

  // Function for manual certificate validation with uploaded CAs
  const validateWithUploadedCAs = async () => {
    if (!response?.certificate?.raw || uploadedCAs.length === 0) {
      alert('Please upload at least one CA certificate');
      return;
    }

    try {
      setValidationStatus('pending');
      
      const response_api = await fetch('/api/validate-certificate-with-ca', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          certificate: response.certificate.raw,
          caCertificates: uploadedCAs.map(ca => ca.content)
        })
      });

      if (!response_api.ok) {
        throw new Error('Validation failed');
      }

      const result = await response_api.json();
      setValidationResult(result);
      setValidationStatus('completed');
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        valid: false,
        error: 'Failed to verify certificate'
      });
      setValidationStatus('completed');
    }
  };

  // Function for uploading CA certificates
  const handleCAUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newCAs: {name: string; content: string}[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      if (text.includes('-----BEGIN CERTIFICATE-----')) {
        newCAs.push({
          name: file.name,
          content: text
        });
      } else {
        alert(`File ${file.name} is not a valid PEM certificate`);
      }
    }
    
    setUploadedCAs([...uploadedCAs, ...newCAs]);
    // Reset validation when uploading new CAs
    setValidationStatus('none');
    setValidationResult(null);
  };

  // Function for removing individual CA certificate
  const removeCA = (index: number) => {
    const newCAs = uploadedCAs.filter((_, i) => i !== index);
    setUploadedCAs(newCAs);
    setValidationStatus('none');
    setValidationResult(null);
  };

  useEffect(() => {
    fetch('/api/certificate')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load certificate information');
        return res.json();
      })
      .then(data => {
        console.log('Certificate response:', data);
        setResponse(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700 p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            <p className="text-gray-300">Loading certificate information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700 p-8 max-w-md w-full mx-4">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-2">Connection Error</h2>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (response && response.status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
              🔐 SSL Client Test
            </h1>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <h2 className="text-2xl font-bold text-red-400">Certificate Parsing Error</h2>
              <p className="text-gray-300 max-w-md">
                {response.error || 'There was an error parsing your certificate.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle different certificate states
  if (response && response.status === 'missing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              🔐 SSL Client Test
            </h1>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-100">No Certificate Provided</h2>
              <p className="text-gray-300 max-w-md">
                Your browser did not send a client certificate. This usually means you don't have any personal certificates installed.
              </p>
              <div className="bg-gray-900/50 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-400">
                  To test this application, you need a client certificate installed in your browser or system certificate store.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // Show certificate details for both valid and invalid certificates
  const certificate = response?.certificate;
  const isValid = validationStatus === 'completed' && validationResult?.valid === true;
  const hasValidationResult = validationStatus === 'completed';
  
  if (!response || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
              🔐 SSL Client Test
            </h1>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <h2 className="text-2xl font-bold text-red-400">Error Processing Certificate</h2>
              <p className="text-gray-300 max-w-md">
                There was an error processing your certificate. Please try refreshing the page.
              </p>
              <pre className="bg-gray-900/50 rounded-lg p-4 mt-4 text-xs text-gray-400 max-w-full overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            🔐 SSL Client Test
          </h1>
          <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full border ${
            hasValidationResult 
              ? (isValid 
                ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                : 'bg-red-500/20 text-red-400 border-red-500/50')
              : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
          }`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-semibold">
              {hasValidationResult 
                ? (isValid ? 'Certificate successfully verified' : 'Certificate verification failed')
                : 'Certificate successfully loaded'
              }
            </span>
          </div>
          
        </div>

        {/* Certificate validation section */}
        {certificate && (
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-6 mb-6 max-w-5xl mx-auto">
            <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Certificate Verification
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload CA certificates (intermediate and/or root) for verification:
                </label>
                
                {/* List of uploaded files */}
                {uploadedCAs.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {uploadedCAs.map((ca, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-gray-300">{ca.name}</span>
                        </div>
                        <button
                          onClick={() => removeCA(index)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                          title="Remove certificate"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <label className="relative block">
                  <input
                    type="file"
                    multiple
                    accept=".pem,.crt,.cer"
                    onChange={handleCAUpload}
                    className="sr-only"
                  />
                  <div className="cursor-pointer bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg px-6 py-3 text-center transition-colors">
                    <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">
                      Click to upload CA certificates
                    </span>
                    <span className="block text-xs mt-1 text-purple-300">
                      or drag and drop .pem, .crt, .cer files here
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={validateWithUploadedCAs}
                  disabled={uploadedCAs.length === 0 || validationStatus === 'pending'}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    uploadedCAs.length === 0 || validationStatus === 'pending'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {validationStatus === 'pending' ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </span>
                  ) : (
                    'Verify Certificate'
                  )}
                </button>

                {uploadedCAs.length > 0 && (
                  <button
                    onClick={() => {
                      setUploadedCAs([]);
                      setValidationStatus('none');
                      setValidationResult(null);
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Validation result */}
              {validationStatus === 'completed' && validationResult && (
                <div className={`p-4 rounded-lg border ${
                  validationResult.valid 
                    ? 'bg-green-900/20 border-green-500/50' 
                    : 'bg-red-900/20 border-red-500/50'
                }`}>
                  {validationResult.valid ? (
                    <p className="text-sm text-green-400">
                      ✅ <strong>Certificate successfully verified!</strong>
                      {validationResult.message && (
                        <span className="block mt-1 text-gray-300">{validationResult.message}</span>
                      )}
                    </p>
                  ) : (
                    <div>
                      <p className="text-sm text-red-400">
                        ❌ <strong>Certificate verification failed</strong>
                      </p>
                      <div className="mt-2 text-sm text-gray-300">
                        {/* Analyze error and provide helpful instructions */}
                        {validationResult.details && (validationResult.details.includes('unable to get issuer certificate') || validationResult.details.includes('unable to get local issuer certificate')) ? (
                          <div className="space-y-2">
                            <p>
                              <strong>Missing certificate in the chain:</strong>
                            </p>
                            <p>
                              The certificate chain is incomplete. You need to upload additional CA certificates:
                            </p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                              {validationResult.details.includes('error 2 at 1 depth') && (
                                <li>Missing the <strong>Root CA certificate</strong> that issued your intermediate CA</li>
                              )}
                              {validationResult.details.includes('error 20 at 0 depth') && (
                                <li>Missing the <strong>Intermediate CA certificate</strong> that issued your certificate</li>
                              )}
                              {validationResult.details.includes('unable to get local issuer certificate') && 
                               !validationResult.details.includes('error 2 at 1 depth') && 
                               !validationResult.details.includes('error 20 at 0 depth') && (
                                <li>Missing one or more <strong>Intermediate CA certificates</strong> in the certificate chain</li>
                              )}
                              <li>Make sure to upload the complete certificate chain</li>
                            </ul>
                          </div>
                        ) : validationResult.details && validationResult.details.includes('self signed certificate') ? (
                          <p>
                            The certificate is self-signed and cannot be verified against a CA.
                          </p>
                        ) : (
                          <p>
                            {validationResult.error || 'The certificate could not be verified against the provided CA certificates.'}
                          </p>
                        )}
                      </div>
                      {validationResult.details && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-300 text-sm">
                            Show technical details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-900/50 p-2 rounded overflow-auto text-gray-400">
                            {validationResult.details}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {certificate && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Subject Information */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-6 hover:shadow-2xl transition-shadow">
              <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Subject Information
              </h3>
              <div className="space-y-3">
                {certificate.subject.CN && (
                  <div>
                    <label className="text-sm text-gray-400">Common Name (CN)</label>
                    <p className="text-gray-200 font-medium">{certificate.subject.CN}</p>
                  </div>
                )}
                {certificate.subject.O && (
                  <div>
                    <label className="text-sm text-gray-400">Organization (O)</label>
                    <p className="text-gray-200 font-medium">{certificate.subject.O}</p>
                  </div>
                )}
                {certificate.subject.OU && (
                  <div>
                    <label className="text-sm text-gray-400">Organizational Unit (OU)</label>
                    <p className="text-gray-200 font-medium">{certificate.subject.OU}</p>
                  </div>
                )}
                {certificate.subject.emailAddress && (
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-gray-200 font-medium">{certificate.subject.emailAddress}</p>
                  </div>
                )}
                {certificate.subject.C && (
                  <div>
                    <label className="text-sm text-gray-400">Country (C)</label>
                    <p className="text-gray-200 font-medium">{certificate.subject.C}</p>
                  </div>
                )}
                {certificate.subject.ST && (
                  <div>
                    <label className="text-sm text-gray-400">State/Province (ST)</label>
                    <p className="text-gray-200 font-medium">{certificate.subject.ST}</p>
                  </div>
                )}
                {certificate.subject.L && (
                  <div>
                    <label className="text-sm text-gray-400">Locality (L)</label>
                    <p className="text-gray-200 font-medium">{certificate.subject.L}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Issuer Information */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-6 hover:shadow-2xl transition-shadow">
              <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Issuer Information
              </h3>
              <div className="space-y-3">
                {certificate.issuer.CN && (
                  <div>
                    <label className="text-sm text-gray-400">Common Name (CN)</label>
                    <p className="text-gray-200 font-medium">{certificate.issuer.CN}</p>
                  </div>
                )}
                {certificate.issuer.O && (
                  <div>
                    <label className="text-sm text-gray-400">Organization (O)</label>
                    <p className="text-gray-200 font-medium">{certificate.issuer.O}</p>
                  </div>
                )}
                {certificate.issuer.OU && (
                  <div>
                    <label className="text-sm text-gray-400">Organizational Unit (OU)</label>
                    <p className="text-gray-200 font-medium">{certificate.issuer.OU}</p>
                  </div>
                )}
                {certificate.issuer.C && (
                  <div>
                    <label className="text-sm text-gray-400">Country (C)</label>
                    <p className="text-gray-200 font-medium">{certificate.issuer.C}</p>
                  </div>
                )}
                {certificate.issuer.ST && (
                  <div>
                    <label className="text-sm text-gray-400">State/Province (ST)</label>
                    <p className="text-gray-200 font-medium">{certificate.issuer.ST}</p>
                  </div>
                )}
                {certificate.issuer.L && (
                  <div>
                    <label className="text-sm text-gray-400">Locality (L)</label>
                    <p className="text-gray-200 font-medium">{certificate.issuer.L}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Certificate Validity */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-6 hover:shadow-2xl transition-shadow">
              <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Certificate Validity
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-400">Valid From</label>
                  <p className="text-gray-200 font-medium">
                    {new Date(certificate.valid_from).toLocaleString('en-US')}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Valid To</label>
                  <p className="text-gray-200 font-medium">
                    {new Date(certificate.valid_to).toLocaleString('en-US')}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Serial Number</label>
                  <p className="text-gray-200 font-mono text-sm bg-gray-900/50 px-3 py-1 rounded">
                    {certificate.serialNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Information */}
            <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl shadow-xl border border-gray-700 p-6 hover:shadow-2xl transition-shadow md:col-span-2">
              <h3 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Technical Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">SHA-1 Fingerprint</label>
                  <p className="text-gray-200 font-mono text-xs bg-gray-900/50 px-3 py-2 rounded mt-1 break-all">
                    {certificate.fingerprint}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">SHA-256 Fingerprint</label>
                  <p className="text-gray-200 font-mono text-xs bg-gray-900/50 px-3 py-2 rounded mt-1 break-all">
                    {certificate.fingerprint256}
                  </p>
                </div>
                {certificate.subjectaltname && (
                  <div>
                    <label className="text-sm text-gray-400">Subject Alternative Names</label>
                    <p className="text-gray-200 font-medium mt-1">{certificate.subjectaltname}</p>
                  </div>
                )}
                {certificate.ext_key_usage && certificate.ext_key_usage.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-400">Extended Key Usage</label>
                    <p className="text-gray-200 font-medium mt-1">
                      {certificate.ext_key_usage.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 