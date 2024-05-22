import React, { useEffect, useState } from 'react';

const App: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        setError(String(chrome.runtime.lastError.message));
        return;
      }

      fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setError(data.error.message);
            console.error(data.error.message);
          } else {
            setProfile(data);
          }
        })
        .catch((error) => {
          console.error('Error fetching user profile:', error);
          setError('Failed to fetch user profile.');
        });

      fetch(
        'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
        .then((response) => response.json())
        .then((data) => {
          if (data.error) {
            setError(data.error.message);
            console.error(data.error.message);
          } else {
            setContacts(data.connections || []);
          }
        })
        .catch((error) => {
          console.error('Error fetching contacts:', error);
          setError('Failed to fetch contacts.');
        });
    });
  }, []);

  const getAuthToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'getAuthToken' }, (response) => {
        if (response.error) {
          reject(response.error);
        } else {
          resolve(response.token);
        }
      });
    });
  };

  const handleAuthClick = () => {
    getAuthToken()
      .then((token) => {
        fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((response) => response.json())
          .then((data) => setProfile(data));

        fetch(
          'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
          .then((response) => response.json())
          .then((data) => setContacts(data.connections || []));
      })
      .catch((error) => console.error(error));
  };

  const handleLogoutClick = () => {
    getAuthToken()
      .then((token) => {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
          .then(() => {
            setProfile(null);
            setContacts([]);
          })
          .catch((error) => {
            console.error('Error revoking token:', error);
          });
      })
      .catch((error) => console.error(error));
  };

  return (
    <div className="p-4">
      {!!error && <h1>{error}</h1>}
      {!profile ? (
        <button
          onClick={handleAuthClick}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Authenticate with Google
        </button>
      ) : (
        <div className="container">
          <h1 className="text-xl font-bold">Hello, {profile.name}</h1>
          <p>Email: {profile.email}</p>
          <button
            onClick={handleLogoutClick}
            className="bg-red-500 text-white px-4 py-2 rounded mt-4"
          >
            Logout
          </button>
          <h2 className="text-lg font-bold mt-4">Contacts</h2>
          <ul>
            {contacts.map((contact, index) => (
              <li key={index}>
                {contact.names?.[0]?.displayName || 'No name'} -{' '}
                {contact.emailAddresses?.[0]?.value || 'No email'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;
