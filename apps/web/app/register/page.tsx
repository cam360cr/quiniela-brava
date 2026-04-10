'use client';

import { useState } from 'react';
import Nav from '../../components/Nav';
import { register } from '../../lib/auth';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string|null>(null);
  const router = useRouter();

  return (
    <>
      <Nav />
      <div className="card">
        <h2 style={{marginTop:0}}>Crear cuenta</h2>
        {msg && <div className="card">{msg}</div>}

        <div className="label">Email</div>
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com" />

        <div className="label">Usuario</div>
        <input className="input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="usuario_123" />

        <div className="label">Contraseña</div>
        <input className="input" value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="mínimo 6" />

        <div style={{marginTop:12}} className="row-actions">
          <button className="btn primary" onClick={async ()=>{
            setMsg(null);
            try{
              await register(email, username, password);
              router.push('/login');
            }catch(e:any){
              setMsg(e.message);
            }
          }}>Crear</button>
        </div>
      </div>
    </>
  );
}
