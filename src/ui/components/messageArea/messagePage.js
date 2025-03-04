import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient"; 
import Message from "./messages"; 

const MessagePage = ({ recipientId }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data.user);
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <Message user={user} recipientId={recipientId} />
    </div>
  );
};

export default MessagePage;