function GetOrderedArraybyValue(value)
{
    var i;
    var feld = [];

    for (i = 0; i < 16; i++)
    {
        feld[i] = value % 2;
        value = float2int(value/2);
    }

    return feld;
}

function GetValueByOrderedArray(arr)
{
  var result = 0;

  for(var a = 15; a >= 0; a--)
  {
        result = result + (arr[a] * 1<<a);
  }

  return result;
}

function float2int(value) {
    return  Math.trunc(value);
}

function isKInNSet(n, k) 
{ 
    if (n & (1 << (k))) 
        return true; 
    else
        return false;
}

function createWSSetCommand(btnnr)
{
    let start = 0;

    if(btnnr > 7)
    {
        start = 8;
    }

    for(let a = start; a < 8+start; a++)
    {
        if(a!=btnnr)
            currentStatusArray[a] = 0;
        else
            currentStatusArray[a] = 1;
    }

    let wsresult = "X/0/"+GetValueByOrderedArray(currentStatusArray)+"/";

    if(btnnr<8)
        wsresult+= "1";
    else
        wsresult+= "2";

    return wsresult; // todo make bank configurable!
}
